import SwiftUI

struct ContentView: View {
    @StateObject private var coordinator = WebCoordinator()

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            WebView(coordinator: coordinator)
                .ignoresSafeArea()

            if coordinator.isLoading && !coordinator.didLoadOnce {
                SplashView()
                    .transition(.opacity)
            }

            if let error = coordinator.lastError, !coordinator.didLoadOnce {
                ErrorView(message: error.localizedDescription) {
                    coordinator.reload()
                }
            }
        }
        .animation(.easeOut(duration: 0.25), value: coordinator.isLoading)
    }
}

private struct SplashView: View {
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(red: 0.05, green: 0.07, blue: 0.12), .black],
                startPoint: .top, endPoint: .bottom
            )
            .ignoresSafeArea()

            VStack(spacing: 16) {
                Image(systemName: "house.fill")
                    .font(.system(size: 64, weight: .semibold))
                    .foregroundStyle(.white)
                Text("Gino-Home")
                    .font(.title.weight(.semibold))
                    .foregroundStyle(.white)
                ProgressView()
                    .tint(.white)
                    .padding(.top, 8)
            }
        }
    }
}

private struct ErrorView: View {
    let message: String
    let retry: () -> Void

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "wifi.exclamationmark")
                .font(.system(size: 48))
                .foregroundStyle(.white)
            Text("Verbindung nicht möglich")
                .font(.headline)
                .foregroundStyle(.white)
            Text(message)
                .font(.footnote)
                .foregroundStyle(.white.opacity(0.7))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
            Button("Erneut versuchen", action: retry)
                .buttonStyle(.borderedProminent)
                .tint(.white)
                .foregroundStyle(.black)
        }
        .padding(32)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.black.opacity(0.92))
        .ignoresSafeArea()
    }
}
