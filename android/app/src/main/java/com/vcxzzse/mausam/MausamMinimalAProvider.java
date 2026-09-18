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
        if (appWidgetIds != null) {
            for (int appWidgetId : appWidgetIds) {
                updateAppWidget(context, appWidgetManager, appWidgetId);
            }
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
        String preset = prefs.getString("preset", "sunny");
        boolean isLight = "light".equalsIgnoreCase(mode);
        boolean isNight = "moon".equalsIgnoreCase(preset)
                || "overcast-night".equalsIgnoreCase(preset);

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_minimal_a);

        int hiColor = isLight ? 0xFF1C1C1E : 0xFFFFFFFF;
        int loColor = isLight ? 0xFF6C6C70 : 0xFF8E8E93;
        int bgDrawable = isLight ? R.drawable.widget_bg_minimal_light : R.drawable.widget_bg_minimal_dark;

        views.setInt(R.id.widget_a_root, "setBackgroundResource", bgDrawable);

        // Row 1: temp now
        views.setTextViewText(R.id.widget_a_temp, temp);
        views.setTextColor(R.id.widget_a_temp, hiColor);
        views.setTextColor(R.id.widget_a_now, loColor);

        // Row 2: in City
        views.setTextColor(R.id.widget_a_in, loColor);
        views.setTextViewText(R.id.widget_a_city, city);
        views.setTextColor(R.id.widget_a_city, hiColor);

        // Row 3: feels 18°
        views.setTextColor(R.id.widget_a_feels, loColor);
        views.setTextViewText(R.id.widget_a_feels_like, feelsLike);
        views.setTextColor(R.id.widget_a_feels_like, hiColor);

        // Row 4: [icon] condition next
        int iconRes = getConditionDrawable(conditionKey, isNight);
        views.setImageViewResource(R.id.widget_a_icon, iconRes);
        views.setInt(R.id.widget_a_icon, "setColorFilter", hiColor);

        String displayCondition = formatConditionText(condition, conditionKey);
        views.setTextViewText(R.id.widget_a_condition, displayCondition);
        views.setTextColor(R.id.widget_a_condition, hiColor);
        views.setTextColor(R.id.widget_a_next, loColor);

        // Row 5: 2 hrs / 1 hr
        String hoursText = nextHours <= 1 ? "1 hr" : (nextHours + " hrs");
        views.setTextViewText(R.id.widget_a_hours, hoursText);
        views.setTextColor(R.id.widget_a_hours, loColor);

        // Click to launch app
        Intent launchIntent = new Intent(context, MainActivity.class);
        launchIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                context,
                appWidgetId,
                launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_a_root, pendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    public static int getConditionDrawable(String key, boolean isNight) {
        if (key == null) return isNight ? R.drawable.ic_widget_moon : R.drawable.ic_weather_clear;
        switch (key.toLowerCase()) {
            case "clear":
            case "sunny":
                return isNight ? R.drawable.ic_widget_moon : R.drawable.ic_weather_clear;
            case "partly-cloudy":
                return R.drawable.ic_weather_partly_cloudy;
            case "cloudy":
            case "overcast":
                return R.drawable.ic_weather_cloudy;
            case "foggy":
            case "mist":
            case "haze":
                return R.drawable.ic_weather_foggy;
            case "drizzle":
            case "rain":
                return R.drawable.ic_weather_rain;
            case "heavy-rain":
            case "thunderstorm":
                return R.drawable.ic_weather_thunderstorm;
            case "snow":
                return R.drawable.ic_weather_snow;
            default:
                return isNight ? R.drawable.ic_widget_moon : R.drawable.ic_weather_clear;
        }
    }

    public static String formatConditionText(String condition, String conditionKey) {
        if (condition != null && !condition.trim().isEmpty() && condition.trim().length() <= 12) {
            return condition.trim().toLowerCase();
        }
        if (conditionKey != null && !conditionKey.trim().isEmpty()) {
            return conditionKey.replace("-", " ").toLowerCase();
        }
        return "clear";
    }
}
