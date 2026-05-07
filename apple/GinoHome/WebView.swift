import SwiftUI
import WebKit

private let safariUA =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) "
    + "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"

private let macSafariUA =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) "
    + "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"

private func makeConfiguredWebView(coordinator: WebCoordinator) -> WKWebView {
    let userController = WKUserContentController()
    userController.add(coordinator, name: AuthBridge.messageHandlerName)

    let bridgeScript = WKUserScript(
        source: AuthBridge.injectedJS,
        injectionTime: .atDocumentStart,
        forMainFrameOnly: false
    )
    userController.addUserScript(bridgeScript)

    let config = WKWebViewConfiguration()
    config.userContentController = userController
    config.websiteDataStore = .default()
    #if canImport(UIKit)
    config.allowsInlineMediaPlayback = true
    config.mediaTypesRequiringUserActionForPlayback = []
    #endif

    let webView = WKWebView(frame: .zero, configuration: config)
    webView.navigationDelegate = coordinator
    webView.uiDelegate = coordinator
    webView.allowsBackForwardNavigationGestures = true

    #if canImport(UIKit)
    webView.scrollView.bounces = true
    webView.scrollView.alwaysBounceVertical = true
    webView.isOpaque = false
    webView.backgroundColor = .black
    webView.scrollView.backgroundColor = .black
    webView.customUserAgent = safariUA
    #else
    webView.setValue(false, forKey: "drawsBackground")
    webView.customUserAgent = macSafariUA
    #endif

    return webView
}

#if canImport(UIKit)
import UIKit

struct WebView: UIViewRepresentable {
    @ObservedObject var coordinator: WebCoordinator

    func makeUIView(context: Context) -> WKWebView {
        let webView = makeConfiguredWebView(coordinator: coordinator)

        let refresh = UIRefreshControl()
        refresh.tintColor = .white
        refresh.addTarget(
            coordinator,
            action: #selector(WebCoordinator.handleRefresh(_:)),
            for: .valueChanged
        )
        webView.scrollView.refreshControl = refresh

        coordinator.attach(webView)
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    func makeCoordinator() -> WebCoordinator { coordinator }
}

#elseif canImport(AppKit)
import AppKit

struct WebView: NSViewRepresentable {
    @ObservedObject var coordinator: WebCoordinator

    func makeNSView(context: Context) -> WKWebView {
        let webView = makeConfiguredWebView(coordinator: coordinator)
        coordinator.attach(webView)
        return webView
    }

    func updateNSView(_ nsView: WKWebView, context: Context) {}

    func makeCoordinator() -> WebCoordinator { coordinator }
}
#endif
