package com.vcxzzse.mausam;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

public class MausamTypographic1x1Provider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateAllWidgets(Context context) {
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        ComponentName componentName = new ComponentName(context, MausamTypographic1x1Provider.class);
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

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_typographic_1x1);

        int hiColor = isLight ? 0xFF1C1C1E : 0xFFFFFFFF;
        int loColor = isLight ? 0xFF6C6C70 : 0xFF8E8E93;
        int bgDrawable = isLight ? R.drawable.widget_bg_typographic_1x1_light : R.drawable.widget_bg_typographic_1x1_dark;

        views.setInt(R.id.widget_1x1_root, "setBackgroundResource", bgDrawable);

        // Row 1: temp now
        views.setTextViewText(R.id.widget_1x1_temp, temp);
        views.setTextColor(R.id.widget_1x1_temp, hiColor);
        views.setTextColor(R.id.widget_1x1_now, loColor);

        // Row 2: in City
        views.setTextColor(R.id.widget_1x1_in, loColor);
        views.setTextViewText(R.id.widget_1x1_city, city);
        views.setTextColor(R.id.widget_1x1_city, hiColor);

        // Row 3: feels 18°
        views.setTextColor(R.id.widget_1x1_feels, loColor);
        views.setTextViewText(R.id.widget_1x1_feels_like, feelsLike);
        views.setTextColor(R.id.widget_1x1_feels_like, hiColor);

        // Row 4: [icon] condition next
        int iconRes = MausamMinimalAProvider.getConditionDrawable(conditionKey, isNight);
        views.setImageViewResource(R.id.widget_1x1_icon, iconRes);
        views.setInt(R.id.widget_1x1_icon, "setColorFilter", hiColor);

        String displayCondition = MausamMinimalAProvider.formatConditionText(condition, conditionKey);
        views.setTextViewText(R.id.widget_1x1_condition, displayCondition);
        views.setTextColor(R.id.widget_1x1_condition, hiColor);
        views.setTextColor(R.id.widget_1x1_next, loColor);

        // Row 5: 2 hrs / 1 hr
        String hoursText = nextHours <= 1 ? "1 hr" : (nextHours + " hrs");
        views.setTextViewText(R.id.widget_1x1_hours, hoursText);
        views.setTextColor(R.id.widget_1x1_hours, loColor);

        // Click to launch app
        Intent launchIntent = new Intent(context, MainActivity.class);
        launchIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                context,
                appWidgetId,
                launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_1x1_root, pendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }
}
