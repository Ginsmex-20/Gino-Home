import Foundation
import AuthenticationServices
import WebKit

#if canImport(UIKit)
import UIKit
#elseif canImport(AppKit)
import AppKit
#endif

enum AuthBridge {
    static let messageHandlerName = "nativeAuth"

    static let googleClientID = "242636055004-oh3s00m3523bvmoqhh5upm32nnclab9s.apps.googleusercontent.com"
    static let googleRedirectURL = "https://ginohome.de/auth/native-callback.html"
    static let nativeRedirectScheme = "de.gino-home.app"

    static let injectedJS = """
    (function() {
      window.GinoHomeNative = {
        version: '1.0',
        platform: 'ios',
        signIn(provider) {
          return new Promise((resolve, reject) => {
            const id = Math.random().toString(36).slice(2);
            window.__ginoAuthCallbacks = window.__ginoAuthCallbacks || {};
            window.__ginoAuthCallbacks[id] = { resolve, reject };
            try {
              window.webkit.messageHandlers.nativeAuth.postMessage({
                action: 'signIn',
                provider,
                requestId: id
              });
            } catch (e) {
              delete window.__ginoAuthCallbacks[id];
              reject(new Error('Native bridge unavailable: ' + e.message));
            }
          });
        }
      };
      window.handleNativeAuthResult = function(payload) {
        if (!payload || !payload.requestId) return;
        const cb = window.__ginoAuthCallbacks && window.__ginoAuthCallbacks[payload.requestId];
        if (!cb) return;
        delete window.__ginoAuthCallbacks[payload.requestId];
        if (payload.error) cb.reject(new Error(payload.error));
        else cb.resolve(payload);
      };
    })();
    """
}

final class AuthService: NSObject {
    weak var webView: WKWebView?

    func handleMessage(_ message: [String: Any]) {
        guard
            let action = message["action"] as? String,
            action == "signIn",
            let provider = message["provider"] as? String,
            let requestId = message["requestId"] as? String
        else {
            return
        }

        switch provider {
        case "google":
            startGoogleSignIn(requestId: requestId)
        case "apple":
            startAppleSignIn(requestId: requestId)
        default:
            sendResult(requestId: requestId, error: "Unknown provider: \(provider)")
        }
    }

    // MARK: - Google

    private var currentSession: ASWebAuthenticationSession?

    private func startGoogleSignIn(requestId: String) {
        var components = URLComponents(string: "https://accounts.google.com/o/oauth2/v2/auth")!
        let state = UUID().uuidString
        components.queryItems = [
            .init(name: "client_id", value: AuthBridge.googleClientID),
            .init(name: "redirect_uri", value: AuthBridge.googleRedirectURL),
            .init(name: "response_type", value: "token"),
            .init(name: "scope", value: "openid email profile"),
            .init(name: "include_granted_scopes", value: "true"),
            .init(name: "state", value: state),
            .init(name: "prompt", value: "select_account")
        ]
        guard let authURL = components.url else {
            sendResult(requestId: requestId, error: "Failed to build Google OAuth URL")
            return
        }

        let session = ASWebAuthenticationSession(
            url: authURL,
            callbackURLScheme: AuthBridge.nativeRedirectScheme
        ) { [weak self] callbackURL, error in
            guard let self else { return }
            if let error = error as? ASWebAuthenticationSessionError, error.code == .canceledLogin {
                self.sendResult(requestId: requestId, error: "cancelled")
                return
            }
            if let error = error {
                self.sendResult(requestId: requestId, error: error.localizedDescription)
                return
            }
            guard let callbackURL = callbackURL else {
                self.sendResult(requestId: requestId, error: "No callback URL returned")
                return
            }

            let fragment = callbackURL.fragment ?? callbackURL.query ?? ""
            let parsed = Self.parseQuery(fragment)
            guard let token = parsed["access_token"], !token.isEmpty else {
                let err = parsed["error"] ?? "No access_token in callback"
                self.sendResult(requestId: requestId, error: err)
                return
            }
            self.sendResult(requestId: requestId, payload: [
                "provider": "google",
                "accessToken": token
            ])
        }
        session.presentationContextProvider = self
        session.prefersEphemeralWebBrowserSession = false
        currentSession = session
        session.start()
    }

    private static func parseQuery(_ raw: String) -> [String: String] {
        var out: [String: String] = [:]
        for pair in raw.split(separator: "&") {
            let parts = pair.split(separator: "=", maxSplits: 1).map(String.init)
            guard parts.count == 2 else { continue }
            let key = parts[0].removingPercentEncoding ?? parts[0]
            let val = parts[1].removingPercentEncoding ?? parts[1]
            out[key] = val
        }
        return out
    }

    // MARK: - Apple

    private var pendingAppleRequestId: String?

    private func startAppleSignIn(requestId: String) {
        let provider = ASAuthorizationAppleIDProvider()
        let request = provider.createRequest()
        request.requestedScopes = [.fullName, .email]

        let controller = ASAuthorizationController(authorizationRequests: [request])
        controller.delegate = self
        controller.presentationContextProvider = self
        pendingAppleRequestId = requestId
        controller.performRequests()
    }

    // MARK: - JS callback

    private func sendResult(requestId: String, payload: [String: Any] = [:], error: String? = nil) {
        DispatchQueue.main.async {
            var dict: [String: Any] = ["requestId": requestId]
            if let error = error {
                dict["error"] = error
            } else {
                dict.merge(payload) { _, new in new }
            }
            guard
                let data = try? JSONSerialization.data(withJSONObject: dict),
                let json = String(data: data, encoding: .utf8)
            else { return }
            let js = "window.handleNativeAuthResult(\(json));"
            self.webView?.evaluateJavaScript(js, completionHandler: nil)
        }
    }
}

// MARK: - ASWebAuthenticationPresentationContextProviding

extension AuthService: ASWebAuthenticationPresentationContextProviding {
    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        anchor()
    }
}

// MARK: - ASAuthorizationControllerDelegate

extension AuthService: ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        anchor()
    }

    func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        guard let requestId = pendingAppleRequestId else { return }
        pendingAppleRequestId = nil

        guard
            let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
            let tokenData = credential.identityToken,
            let identityToken = String(data: tokenData, encoding: .utf8)
        else {
            sendResult(requestId: requestId, error: "No identity token from Apple")
            return
        }

        var userPayload: [String: Any] = [:]
        if let name = credential.fullName {
            var nameDict: [String: String] = [:]
            if let given = name.givenName { nameDict["firstName"] = given }
            if let family = name.familyName { nameDict["lastName"] = family }
            if !nameDict.isEmpty { userPayload["name"] = nameDict }
        }
        if let email = credential.email {
            userPayload["email"] = email
        }

        var payload: [String: Any] = [
            "provider": "apple",
            "identityToken": identityToken,
            "userId": credential.user
        ]
        if !userPayload.isEmpty {
            payload["user"] = userPayload
        }

        sendResult(requestId: requestId, payload: payload)
    }

    func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        guard let requestId = pendingAppleRequestId else { return }
        pendingAppleRequestId = nil

        if let authError = error as? ASAuthorizationError, authError.code == .canceled {
            sendResult(requestId: requestId, error: "cancelled")
        } else {
            sendResult(requestId: requestId, error: error.localizedDescription)
        }
    }
}

// MARK: - Anchor helper

private extension AuthService {
    func anchor() -> ASPresentationAnchor {
        #if canImport(UIKit)
        if let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let window = scene.windows.first {
            return window
        }
        return ASPresentationAnchor()
        #elseif canImport(AppKit)
        if let window = NSApplication.shared.keyWindow ?? NSApplication.shared.windows.first {
            return window
        }
        return ASPresentationAnchor()
        #else
        return ASPresentationAnchor()
        #endif
    }
}
