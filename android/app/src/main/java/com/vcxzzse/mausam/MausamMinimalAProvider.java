package com.vcxzzse.mausam;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

public class MausamMinimalAProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateAllWidgets(Context context) {
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        ComponentName componentName = new ComponentName(context, MausamMinimalAProvider.class);
        int[] appWidgetIds = appWidgetManager.getAppWidgetIds(componentName);
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences(MausamWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE);

        String temp = prefs.getString("temperature", "24°");
        String city = prefs.getString("location", "Mausam");
        String feelsLike = prefs.getString("feelsLike", "18°");
        String condition = prefs.getString("condition", "Clear");
        String conditionKey = prefs.getString("conditionKey", "clear");
        int nextHours = prefs.getInt("nextHours", 2);
        String mode = prefs.getString("mode", "dark");
        boolean isLight = "light".equalsIgnoreCase(mode);

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_minimal_a);

        int hiColor = isLight ? 0xFF1A1A1A : 0xFFFFFFFF;
        int loColor = isLight ? 0x5C1A1A1A : 0x66FFFFFF;
        int bgDrawable = isLight ? R.drawable.widget_bg_minimal_light : R.drawable.widget_bg_minimal_dark;

        views.setInt(R.id.widget_a_root, "setBackgroundResource", bgDrawable);

        views.setTextViewText(R.id.widget_a_temp, temp);
        views.setTextColor(R.id.widget_a_temp, hiColor);
        views.setTextColor(R.id.widget_a_now, loColor);

        views.setTextColor(R.id.widget_a_in, loColor);
        views.setTextViewText(R.id.widget_a_city, city);
        views.setTextColor(R.id.widget_a_city, hiColor);

        views.setTextColor(R.id.widget_a_feels, loColor);
        views.setTextViewText(R.id.widget_a_feels_like, feelsLike);
        views.setTextColor(R.id.widget_a_feels_like, hiColor);

        views.setTextViewText(R.id.widget_a_emoji, getConditionEmoji(conditionKey));
        views.setTextViewText(R.id.widget_a_condition, condition);
        views.setTextColor(R.id.widget_a_condition, hiColor);
        views.setTextColor(R.id.widget_a_next, loColor);

        views.setTextViewText(R.id.widget_a_hours, nextHours + " hrs");
        views.setTextColor(R.id.widget_a_hours, loColor);

        // Click to launch app
        Intent launchIntent = new Intent(context, MainActivity.class);
        launchIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                context,
                1,
                launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_a_root, pendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    private static String getConditionEmoji(String key) {
        if (key == null) return "☀️";
        switch (key.toLowerCase()) {
            case "clear": return "☀️";
            case "partly-cloudy": return "⛅";
            case "cloudy": return "☁️";
            case "foggy": return "🌫️";
            case "drizzle": return "🌦️";
            case "rain":
            case "heavy-rain": return "🌧️";
            case "snow": return "🌨️";
            case "thunderstorm": return "⛈️";
            default: return "☀️";
        }
    }
}
