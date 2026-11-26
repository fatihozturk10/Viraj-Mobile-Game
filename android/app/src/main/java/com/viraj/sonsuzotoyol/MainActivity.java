package com.viraj.sonsuzotoyol;

import android.os.Build;
import android.os.Bundle;
import android.view.Display;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebView;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            WindowManager.LayoutParams lp = getWindow().getAttributes();
            lp.layoutInDisplayCutoutMode =
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(lp);
        }
        requestHighRefreshRate();
        if (this.bridge != null && this.bridge.getWebView() != null) {
            WebView webView = this.bridge.getWebView();
            webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
            webView.getSettings().setMediaPlaybackRequiresUserGesture(false);
        }
        applyImmersiveFullscreen();
    }

    private void requestHighRefreshRate() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return;
        try {
            Display display =
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.R
                    ? getDisplay()
                    : getWindowManager().getDefaultDisplay();
            if (display == null) return;
            Display.Mode current = display.getMode();
            Display.Mode best = current;
            for (Display.Mode mode : display.getSupportedModes()) {
                if (
                    mode.getPhysicalWidth() == current.getPhysicalWidth() &&
                    mode.getPhysicalHeight() == current.getPhysicalHeight() &&
                    mode.getRefreshRate() > best.getRefreshRate()
                ) {
                    best = mode;
                }
            }
            if (best != null && best.getModeId() != current.getModeId()) {
                WindowManager.LayoutParams lp = getWindow().getAttributes();
                lp.preferredDisplayModeId = best.getModeId();
                getWindow().setAttributes(lp);
            }
        } catch (Exception ignored) {
            // Fall back to system default refresh rate
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            applyImmersiveFullscreen();
        }
    }

    private void applyImmersiveFullscreen() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        View decorView = getWindow().getDecorView();
        WindowInsetsControllerCompat controller =
            WindowCompat.getInsetsController(getWindow(), decorView);
        if (controller != null) {
            controller.setSystemBarsBehavior(
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            );
            controller.hide(WindowInsetsCompat.Type.systemBars());
        }
    }
}
