package com.aspirantbook.app;

import android.os.Bundle;
import android.webkit.CookieManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Ensure session cookies persist across WebView navigations and reloads
        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        if (bridge != null && bridge.getWebView() != null) {
            cookieManager.setAcceptThirdPartyCookies(bridge.getWebView(), true);
        }
    }
}
