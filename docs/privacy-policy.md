# Mausam Privacy Policy

**Effective date:** [Insert effective date]

**App:** Mausam

**Publisher:** [Insert legal name or business name]

**Contact:** [Insert privacy contact email]

This Privacy Policy explains what information Mausam collects, why it is needed, how it is used, where it is stored or shared, and the choices available to you. It describes the current implementation of the Mausam web app and Android app.

This is a product-specific draft, not legal advice. Before publishing it, the publisher should replace the placeholders and have the policy reviewed for the countries in which Mausam is offered.

## 1. Information We Collect

### 1.1 Profile information you enter

During onboarding, Mausam may ask you to provide:

- Name
- Age
- Height
- Weight
- Gender or gender preference, including the option not to share
- Weather sensitivities, such as dust, pollen, air quality/smoke, humidity, heat, monsoon damp, cold, or UV/sun
- Health considerations, such as asthma, allergies, migraine, skin sensitivity, or heart health
- Goals, such as daily energy, outdoor plans, fitness, sleep, travel, or family care
- Usual activity level: low, moderate, or high

You may also choose options such as “None of these” or “Prefer not to say” where offered.

**Why it is needed:** This information is used to personalize weather briefings, outdoor-window suggestions, health-conscious guidance, activity recommendations, and the profile summary shown in the app sidebar. It is not used to diagnose, treat, or monitor a medical condition.

### 1.2 Location information

Mausam may collect or receive:

- Device latitude and longitude when you choose “Use my current area” and grant location permission
- Approximate location accuracy supplied by the device
- A location selected through manual search
- Locality, region/state, country, postal code, and time zone associated with the location
- Location source, such as device, manual, or demo/default location

**Why it is needed:** Location is required to show weather for the selected area, resolve a readable place name, calculate local time and greetings, and provide location-specific guidance.

You can use a manually searched or demo location instead of granting device location permission.

### 1.3 Weather and environmental information

Mausam retrieves weather and environmental information for the selected location, which may include:

- Temperature and feels-like temperature
- Weather condition and forecast
- Rain probability and rainfall
- Humidity, wind, visibility, pressure, dew point, and heat index
- Sunrise, sunset, moon, and astronomy information
- UV information
- Air-quality information, including India AQI/CPCB data when available
- Pollen estimates, commute information, outdoor guidance, and official-advisory status

This information describes the selected area and is not personal information about you unless combined with your location or profile.

### 1.4 Technical information

The current application does not implement a dedicated analytics, advertising, account, payment, or social-login system. The app may nevertheless receive ordinary technical information necessary to operate the service, such as:

- IP address
- Device, browser, operating-system, and network information
- Request timestamps, URLs, status codes, and error information
- Server, hosting, and security logs

This information may be generated automatically by the browser, Android platform, hosting provider, CDN, API gateway, or external service used to deliver a request. Mausam does not use it to build an advertising profile.

## 2. Device Permissions

### Location permission

The Android app declares coarse and fine location permissions. Mausam requests them only when you choose the current-area location flow. Location is used to obtain coordinates for weather and place resolution.

You can deny or later revoke location permission in Android settings. If you do so, current-area detection will not work, but manual search or the demo location can still be used where available.

### Internet permission

The Android app requires Internet access to retrieve weather, location, air-quality, advisory, and personalized-briefing responses. Network access is not used to read unrelated files, contacts, messages, photos, microphone input, or call history.

### Other device access

The current app does not intentionally request access to contacts, camera, microphone, photos/media, SMS, phone calls, Bluetooth, calendar, or advertising ID.

## 3. Local Storage on Your Device

Mausam currently stores the following in browser or WebView local storage on your device:

- The onboarding profile under the `mausam-profile` record
- The selected location under the `mausam-location` record
- Your light/dark theme preference under the `mausam-theme` record

The profile and location records may contain the fields described above, including name, age, height, weight, preferences, coordinates, locality, region, country, postal code, time zone, accuracy, and source.

This storage is used to restore your profile and selected location when you reopen the app. The current implementation does not require a Mausam account or password.

### Deleting local information

The sidebar’s **Log out** action clears the saved profile and location from the device. Theme preference may remain because it is a presentation setting. You can also clear the app’s storage by clearing Android app data, uninstalling the app, or clearing the browser/WebView site data.

Clearing local storage does not necessarily delete copies already sent to an external service or included in ordinary server logs.

## 4. How We Use Information

Mausam uses information to:

1. Create and restore your local profile.
2. Resolve and remember your selected location.
3. Request current and forecast weather for that location.
4. Request reverse geocoding or search results so the app can display a readable place name.
5. Calculate local time, greetings, sunrise/sunset context, and other derived weather displays.
6. Personalize recommendations using the weather sensitivities, health considerations, goals, activity level, and environmental conditions you selected.
7. Display the profile and location in the sidebar and dashboard.
8. Maintain, troubleshoot, secure, and improve the service.
9. Detect, investigate, and prevent abuse, fraud, security incidents, and technical failures.
10. Comply with applicable law or respond to valid legal requests.

Mausam does not use profile information to make medical diagnoses. Weather and health-related suggestions are general informational guidance, not medical advice.

## 5. Information Shared With Services

### 5.1 Mausam weather API

The app sends selected location information to the Mausam weather API, currently configured as a Vercel-hosted endpoint. Requests can include:

- Latitude and longitude
- Locality
- Region/state
- Country
- Location source

The API uses this information to return weather and environmental data. The API host may process technical request metadata such as IP address and timestamps under its own privacy policy and hosting arrangements.

### 5.2 Location services

Location lookup may use:

- The Mausam location endpoints for reverse geocoding and Indian location search when running through the configured deployment
- OpenStreetMap Nominatim as a fallback in some web-hosted flows

A location search request may include the search text or six-digit Indian PIN code. A reverse-geocoding request may include latitude and longitude. Review the applicable OpenStreetMap/Nominatim usage and privacy terms before public release.

### 5.3 Personalized briefing API

When you open the personalized briefing, the app may send:

- A derived persona category, such as health, commuter, outdoor, or general
- A derived sensitivity level, such as low, normal, or high
- The selected locality
- Weather coordinates when available

The current frontend does not send your name, age, height, weight, gender, or the complete raw profile to this endpoint. The backend may use the request to produce a personalized briefing. The deployment operator may retain ordinary request logs or temporary cache entries according to its infrastructure configuration.

### 5.4 Weather, air-quality, astronomy, advisory, and other providers

The Mausam backend may request data from configured weather, air-quality, astronomy, advisory, and geocoding providers. The exact provider and data availability can change as the service is developed. These providers may receive location or area information and technical request metadata needed to answer the request. Their own privacy policies apply to their processing.

## 6. Retention

- Profile, location, and theme data remain in local storage until you log out, clear app/browser data, uninstall the app, or otherwise remove the storage.
- Weather and location requests are made when needed and may be cached temporarily by the app, backend, or provider to improve reliability and performance.
- Server and provider logs may be retained according to the relevant operator’s security, legal, and operational requirements.
- Mausam does not currently provide user accounts or a user-facing server dashboard for deleting server logs. Contact the publisher at the address above for privacy requests.

The publisher should add specific retention periods here before publishing if the production backend, hosting, or provider configuration defines them.

## 7. Sharing and Disclosure

Mausam does not sell personal information. Information may be disclosed:

- To service providers that host, secure, operate, or support Mausam
- To weather, geocoding, air-quality, astronomy, or advisory providers needed to provide app features
- When required by law, court order, or valid legal process
- To protect the rights, safety, security, and property of users, the publisher, or others
- In connection with a merger, acquisition, financing, restructuring, or transfer of the service, subject to applicable law

## 8. Security

Mausam uses reasonable technical and organizational measures appropriate to the nature of the information it processes. No Internet transmission or electronic storage system is completely secure. Users should avoid entering information they do not want stored on the device or sent as part of a feature request.

## 9. Children

Mausam is not knowingly directed to children under the minimum age required by applicable law. The publisher should define the intended age requirement and child-data process before publishing this policy.

## 10. Your Choices and Rights

Depending on where you live, you may have rights to:

- Know what personal information is processed
- Request access to or a copy of personal information
- Request correction of inaccurate information
- Request deletion, subject to legal and operational exceptions
- Object to or restrict certain processing
- Withdraw device location permission
- Opt out of certain communications or processing, if introduced later
- Complain to a data-protection authority

To make a request, contact **[Insert privacy contact email]**. We may need enough information to verify and respond to the request without exposing another person’s data.

## 11. International Processing

Mausam and its service providers may process information in countries different from the country where you use the app. Where required, the publisher will use appropriate safeguards for international transfers.

## 12. Changes to This Policy

This policy may be updated when Mausam’s features, providers, legal requirements, or data practices change. The updated version will include a new effective date. Material changes should be communicated through the app or another appropriate channel where required by law.

## 13. Contact

For privacy questions or requests:

**Publisher:** [Insert legal name or business name]

**Email:** [Insert privacy contact email]

**Postal address:** [Insert business address, if required]
