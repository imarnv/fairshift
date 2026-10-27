// ShiftSaathi for iPhone: the live web app in a native shell, plus a native QR scanner.
//
// The web app does all the work, so this shell always shows the latest deployed
// version and never needs rebuilding for a web change. It adds what Safari's web
// view lacks on iPhone: a camera QR reader, which the page calls through
// window.ShiftSaathiNative.scan(), and permission for the page's microphone.

import AVFoundation
import SwiftUI
import WebKit

// Opens the worker app; a worker who is not signed in is sent to sign-in. No landing page.
let startURL = ProcessInfo.processInfo.environment["SHIFTSAATHI_URL"].flatMap(URL.init(string:))   // set in Xcode to test a local server
    ?? URL(string: "https://shiftsaathi-737262865993.asia-south1.run.app/worker/")!
let paper = Color(red: 245 / 255, green: 242 / 255, blue: 234 / 255)

@main
struct ShiftSaathiApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}

struct ContentView: View {
    @State private var scanning = false
    @State private var web = WebShell()

    var body: some View {
        WebView(shell: web, onScanRequest: { scanning = true })
            .background(paper.ignoresSafeArea())
            .sheet(isPresented: $scanning) {
                QRScanner { code in
                    scanning = false
                    web.deliverScan(code)
                }
                .ignoresSafeArea()
            }
    }
}

/// Owns the web view so the scanner can hand a code back to the page.
final class WebShell {
    let view: WKWebView

    init() {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        // Tells the page a native scanner exists; the page then shows "Scan site QR".
        let bridge = "window.ShiftSaathiNative = { scan: () => window.webkit.messageHandlers.scan.postMessage(null) };"
        config.userContentController.addUserScript(WKUserScript(source: bridge, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        view = WKWebView(frame: .zero, configuration: config)
        view.isOpaque = false
        view.backgroundColor = .clear
        view.allowsBackForwardNavigationGestures = true
        view.load(URLRequest(url: startURL))
    }

    /// Hands the scanned code to the page, or null if the worker closed the camera.
    func deliverScan(_ code: String?) {
        // JSON-encode the code so nothing in it can break out of the string.
        guard let data = try? JSONEncoder().encode(code), let json = String(data: data, encoding: .utf8) else { return }
        view.evaluateJavaScript("window.dispatchEvent(new CustomEvent('native-scan', { detail: \(json) }))")
    }
}

struct WebView: UIViewRepresentable {
    let shell: WebShell
    let onScanRequest: () -> Void

    func makeCoordinator() -> Coordinator { Coordinator(onScanRequest: onScanRequest) }

    func makeUIView(context: Context) -> WKWebView {
        shell.view.uiDelegate = context.coordinator
        shell.view.configuration.userContentController.add(context.coordinator, name: "scan")
        return shell.view
    }

    func updateUIView(_ view: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKUIDelegate, WKScriptMessageHandler {
        let onScanRequest: () -> Void
        init(onScanRequest: @escaping () -> Void) { self.onScanRequest = onScanRequest }

        func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
            onScanRequest()
        }

        // The voice assistant's microphone: iOS has already asked the worker for the app's permission.
        func webView(_ webView: WKWebView, requestMediaCapturePermissionFor origin: WKSecurityOrigin,
                     initiatedByFrame frame: WKFrameInfo, type: WKMediaCaptureType,
                     decisionHandler: @escaping (WKPermissionDecision) -> Void) {
            decisionHandler(origin.host == startURL.host ? .grant : .deny)
        }
    }
}

/// A full-screen camera that reports the first QR code it sees, or nil if closed.
struct QRScanner: UIViewControllerRepresentable {
    let onResult: (String?) -> Void

    func makeUIViewController(context: Context) -> ScannerController { ScannerController(onResult: onResult) }
    func updateUIViewController(_ controller: ScannerController, context: Context) {}
}

final class ScannerController: UIViewController, AVCaptureMetadataOutputObjectsDelegate {
    private let session = AVCaptureSession()
    private let onResult: (String?) -> Void
    private var done = false

    init(onResult: @escaping (String?) -> Void) {
        self.onResult = onResult
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) { fatalError("not used") }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black
        guard let camera = AVCaptureDevice.default(for: .video),
              let input = try? AVCaptureDeviceInput(device: camera), session.canAddInput(input) else {
            finish(nil)
            return
        }
        session.addInput(input)
        let output = AVCaptureMetadataOutput()
        session.addOutput(output)
        output.setMetadataObjectsDelegate(self, queue: .main)
        output.metadataObjectTypes = [.qr]

        let preview = AVCaptureVideoPreviewLayer(session: session)
        preview.videoGravity = .resizeAspectFill
        preview.frame = view.bounds
        view.layer.addSublayer(preview)
        addCloseButton()
        DispatchQueue.global(qos: .userInitiated).async { self.session.startRunning() }
    }

    private func addCloseButton() {
        let close = UIButton(type: .system)
        close.setTitle("Close", for: .normal)
        close.titleLabel?.font = .systemFont(ofSize: 18, weight: .semibold)
        close.tintColor = .white
        close.addAction(UIAction { [weak self] _ in self?.finish(nil) }, for: .touchUpInside)
        close.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(close)
        NSLayoutConstraint.activate([
            close.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            close.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -24),
        ])
    }

    func metadataOutput(_ output: AVCaptureMetadataOutput, didOutput objects: [AVMetadataObject], from connection: AVCaptureConnection) {
        guard let code = (objects.first as? AVMetadataMachineReadableCodeObject)?.stringValue else { return }
        UINotificationFeedbackGenerator().notificationOccurred(.success)
        finish(code)
    }

    private func finish(_ code: String?) {
        guard !done else { return }
        done = true
        session.stopRunning()
        onResult(code)
    }
}
