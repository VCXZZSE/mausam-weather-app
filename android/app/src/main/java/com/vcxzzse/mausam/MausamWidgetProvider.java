package com.vcxzzse.mausam;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

public class MausamWidgetProvider extends AppWidgetProvider {

    public static final String PREFS_NAME = "MausamWidgetPrefs";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateAllWidgets(Context context) {
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        ComponentName componentName = new ComponentName(context, MausamWidgetProvider.class);
        int[] appWidgetIds = appWidgetManager.getAppWidgetIds(componentName);
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);

        String location = prefs.getString("location", "MAUSAM");
        String condition = prefs.getString("condition", "Clear Sky");
        String temperature = prefs.getString("temperature", "--°");
        String hi = prefs.getString("hi", "--°");
        String lo = prefs.getString("lo", "--°");
        String preset = prefs.getString("preset", "sunny");
        String mode = prefs.getString("mode", "dark");
        boolean isLight = "light".equalsIgnoreCase(mode);

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_mausam_2x2);

        // Bind text values
        views.setTextViewText(R.id.widget_location, location.toUpperCase());
        views.setTextViewText(R.id.widget_condition, condition);
        views.setTextViewText(R.id.widget_temperature, temperature);
        views.setTextViewText(R.id.widget_high, "H: " + hi);
        views.setTextViewText(R.id.widget_low, "L: " + lo);

        // Apply theme & preset styling
        int bgDrawable;
        int iconDrawable;
        int tempColor;
        int labelColor;
        int subColor;

        if ("thunderstorm".equalsIgnoreCase(preset)) {
            iconDrawable = R.drawable.ic_widget_thunderstorm;
            if (isLight) {
                bgDrawable = R.drawable.widget_bg_thunderstorm_light;
                tempColor = 0xFF142346;
                labelColor = 0xFF1E325A;
                subColor = 0xFF1E325A;
            } else {
                bgDrawable = R.drawable.widget_bg_thunderstorm;
                tempColor = 0xFFC8D7F5;
                labelColor = 0xFFA0B9E1;
                subColor = 0xFF829BC8;
            }
        } else if ("moon".equalsIgnoreCase(preset)) {
            iconDrawable = R.drawable.ic_widget_moon;
            if (isLight) {
                bgDrawable = R.drawable.widget_bg_moon_light;
                tempColor = 0xFF0F1950;
                labelColor = 0xFF1E3282;
                subColor = 0xFF1E3282;
            } else {
                bgDrawable = R.drawable.widget_bg_moon;
                tempColor = 0xFFD7E1FF;
                labelColor = 0xFFB4C8FF;
                subColor = 0xFF96AFF0;
            }
        } else { // default sunny
            iconDrawable = R.drawable.ic_widget_sun;
            if (isLight) {
                bgDrawable = R.drawable.widget_bg_sunny_light;
                tempColor = 0xFF5A2800;
                labelColor = 0xFF643200;
                subColor = 0xFF643200;
            } else {
                bgDrawable = R.drawable.widget_bg_sunny;
                tempColor = 0xFFFFDC78;
                labelColor = 0xFFFFBE50;
                subColor = 0xFFFFAA3C;
            }
        }

        views.setInt(R.id.widget_root, "setBackgroundResource", bgDrawable);
        views.setImageViewResource(R.id.widget_icon, iconDrawable);
        views.setTextColor(R.id.widget_temperature, tempColor);
        views.setTextColor(R.id.widget_location, labelColor);
        views.setTextColor(R.id.widget_high, labelColor);
        views.setTextColor(R.id.widget_low, labelColor);
        views.setTextColor(R.id.widget_condition, subColor);
        views.setTextColor(R.id.widget_feels_like, subColor);

        String feelsLike = prefs.getString("feelsLike", "");
        if (feelsLike != null && !feelsLike.isEmpty() && !feelsLike.equals("--°")) {
            views.setTextViewText(R.id.widget_feels_like, "Feels " + feelsLike);
            views.setViewVisibility(R.id.widget_feels_like, android.view.View.VISIBLE);
        } else {
            views.setViewVisibility(R.id.widget_feels_like, android.view.View.GONE);
        }

        // Click to launch Mausam app
        Intent launchIntent = new Intent(context, MainActivity.class);
        launchIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                context,
                0,
                launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_root, pendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }
}
