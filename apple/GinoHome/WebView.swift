import SwiftUI
import WebKit

#if canImport(UIKit)
import UIKit

struct WebView: UIViewRepresentable {
    @ObservedObject var coordinator: WebCoordinator

    func makeUIView(context: Context) -> WKWebView {
        let userController = WKUserContentController()
        userController.add(context.coordinator, name: AuthBridge.messageHandlerName)

        let bridgeScript = WKUserScript(
            source: AuthBridge.injectedJS,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: false
        )
        userController.addUserScript(bridgeScript)

        let config = WKWebViewConfiguration()
        config.userContentController = userController
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

        let safariUA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) "
            + "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
        webView.customUserAgent = safariUA

        let refresh = UIRefreshControl()
        refresh.tintColor = .white
        refresh.addTarget(
            context.coordinator,
            action: #selector(WebCoordinator.handleRefresh(_:)),
            for: .valueChanged
        )
        webView.scrollView.refreshControl = refresh

        coordinator.attach(webView)
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    func makeCoordinator() -> WebCoordinator {
        coordinator
    }
}
#endif
