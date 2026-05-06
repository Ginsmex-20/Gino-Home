import SwiftUI
import WebKit

#if canImport(UIKit)
import UIKit

struct WebView: UIViewRepresentable {
    @ObservedObject var coordinator: WebCoordinator

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = coordinator
        webView.uiDelegate = coordinator
        webView.allowsBackForwardNavigationGestures = true
        webView.scrollView.bounces = true
        webView.scrollView.alwaysBounceVertical = true
        webView.isOpaque = false
        webView.backgroundColor = .black
        webView.scrollView.backgroundColor = .black

        if let existing = webView.value(forKey: "userAgent") as? String, !existing.isEmpty {
            webView.customUserAgent = existing + " " + AppConfig.userAgentSuffix
        } else {
            webView.customUserAgent = AppConfig.userAgentSuffix
        }

        let refresh = UIRefreshControl()
        refresh.tintColor = .white
        refresh.addTarget(
            context.coordinator,
            action: #selector(WebView.RefreshHandler.refresh(_:)),
            for: .valueChanged
        )
        webView.scrollView.refreshControl = refresh
        context.coordinator.webView = webView

        coordinator.attach(webView)
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    func makeCoordinator() -> RefreshHandler {
        RefreshHandler()
    }

    final class RefreshHandler {
        weak var webView: WKWebView?

        @objc func refresh(_ sender: UIRefreshControl) {
            webView?.reload()
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) {
                sender.endRefreshing()
            }
        }
    }
}
#endif
