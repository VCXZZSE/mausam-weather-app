package com.vcxzzse.mausam;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(MausamWidgetPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
