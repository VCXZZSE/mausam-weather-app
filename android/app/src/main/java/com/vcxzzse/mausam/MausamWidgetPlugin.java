package com.vcxzzse.mausam;

import android.content.Context;
import android.content.SharedPreferences;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "MausamWidget")
public class MausamWidgetPlugin extends Plugin {

    @PluginMethod
    public void updateWidgetData(PluginCall call) {
        String location = call.getString("location", "MAUSAM");
        String condition = call.getString("condition", "Clear Sky");
        String temperature = call.getString("temperature", "--°");
        String hi = call.getString("hi", "--°");
        String lo = call.getString("lo", "--°");
        String preset = call.getString("preset", "sunny");
        String mode = call.getString("mode", "dark");
        String feelsLike = call.getString("feelsLike", "--°");
        String conditionKey = call.getString("conditionKey", "clear");
        int nextHours = call.getInt("nextHours", 2);

        Context context = getContext();
        SharedPreferences prefs = context.getSharedPreferences(MausamWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit()
                .putString("location", location)
                .putString("condition", condition)
                .putString("temperature", temperature)
                .putString("hi", hi)
                .putString("lo", lo)
                .putString("preset", preset)
                .putString("mode", mode)
                .putString("feelsLike", feelsLike)
                .putString("conditionKey", conditionKey)
                .putInt("nextHours", nextHours)
                .apply();

        // Refresh all active home screen widgets
        MausamWidgetProvider.updateAllWidgets(context);
        MausamMinimalAProvider.updateAllWidgets(context);
        MausamTypographic1x1Provider.updateAllWidgets(context);

        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }
}
