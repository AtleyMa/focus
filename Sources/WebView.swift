import SwiftUI
import WebKit

struct FocusWebView: UIViewRepresentable {
    var onScreenTimeBlocked: (Bool) -> Void

    func makeCoordinator() -> Coordinator { Coordinator(onScreenTimeBlocked: onScreenTimeBlocked) }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.userContentController.addUserScript(
            WKUserScript(
                source: FocusRules.scriptSource,
                injectionTime: .atDocumentStart,
                forMainFrameOnly: true
            )
        )
        config.websiteDataStore = .default()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        webView.scrollView.bounces = true

        context.coordinator.attach(webView)

        if let url = URL(string: "https://www.instagram.com/") {
            webView.load(URLRequest(url: url))
        }
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKNavigationDelegate {
        private let onScreenTimeBlocked: (Bool) -> Void
        private var webView: WKWebView?
        private var timer: Timer?

        init(onScreenTimeBlocked: @escaping (Bool) -> Void) {
            self.onScreenTimeBlocked = onScreenTimeBlocked
        }

        func attach(_ webView: WKWebView) {
            self.webView = webView
            timer?.invalidate()
            timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
                guard let self, let webView = self.webView else { return }
                if #available(iOS 26.0, *) {
                    self.onScreenTimeBlocked(webView.isBlockedByScreenTime)
                }
            }
        }

        deinit { timer?.invalidate() }

        func webView(
            _ webView: WKWebView,
            decidePolicyFor navigationAction: WKNavigationAction,
            decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
        ) {
            guard let url = navigationAction.request.url else {
                decisionHandler(.allow)
                return
            }
            let scheme = url.scheme?.lowercased() ?? ""
            if scheme != "http" && scheme != "https" {
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
                return
            }
            decisionHandler(.allow)
        }
    }
}