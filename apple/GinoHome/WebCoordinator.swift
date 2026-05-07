import Foundation
import WebKit
import Combine

#if canImport(UIKit)
import UIKit
#endif

final class WebCoordinator: NSObject, ObservableObject {
    @Published var isLoading: Bool = true
    @Published var didLoadOnce: Bool = false
    @Published var lastError: Error?

    weak var webView: WKWebView?
    private let authService = AuthService()

    func attach(_ webView: WKWebView) {
        self.webView = webView
        authService.webView = webView
        load()
    }

    func load() {
        guard let webView else { return }
        isLoading = true
        lastError = nil
        webView.load(URLRequest(url: AppConfig.webAppURL))
    }

    func reload() {
        guard let webView else { return }
        isLoading = true
        lastError = nil
        if webView.url == nil {
            load()
        } else {
            webView.reload()
        }
    }

    #if canImport(UIKit)
    @objc func handleRefresh(_ sender: UIRefreshControl) {
        webView?.reload()
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) {
            sender.endRefreshing()
        }
    }
    #endif
}

extension WebCoordinator: WKNavigationDelegate {
    func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
        DispatchQueue.main.async { self.isLoading = true }
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        DispatchQueue.main.async {
            self.isLoading = false
            self.didLoadOnce = true
            self.lastError = nil
        }
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        DispatchQueue.main.async {
            self.isLoading = false
            self.lastError = error
        }
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        DispatchQueue.main.async {
            self.isLoading = false
            self.lastError = error
        }
    }

    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
        guard let url = navigationAction.request.url else {
            decisionHandler(.allow); return
        }

        let scheme = url.scheme?.lowercased()
        if scheme == "tel" || scheme == "mailto" || scheme == "sms" {
            #if canImport(UIKit)
            UIApplication.shared.open(url)
            #endif
            decisionHandler(.cancel)
            return
        }

        decisionHandler(.allow)
    }
}

extension WebCoordinator: WKUIDelegate {
    func webView(
        _ webView: WKWebView,
        createWebViewWith configuration: WKWebViewConfiguration,
        for navigationAction: WKNavigationAction,
        windowFeatures: WKWindowFeatures
    ) -> WKWebView? {
        if let url = navigationAction.request.url, navigationAction.targetFrame == nil {
            webView.load(URLRequest(url: url))
        }
        return nil
    }
}

extension WebCoordinator: WKScriptMessageHandler {
    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        guard
            message.name == AuthBridge.messageHandlerName,
            let body = message.body as? [String: Any]
        else { return }
        authService.handleMessage(body)
    }
}
