---
layout: archive
title: "Personal Interests"
permalink: /interests/
author_profile: true
---

**Alpine Climbing, Backpack Hiking, and Global Adventure Travel** ⛰️

**Regularly**

* 🥾 Mountaineering in **Tyrol** and the surrounding Alps

**2026**

* 🏔️ **Chamonix** — a week of mountaineering (June 2026)
* 🧊 **Arctic Circle Trail, Greenland** — backpacking (August 2026)
* 🇮🇶 **Iraq** — upcoming trip (November 2026)

**2025:** Mauritania desert train, Icelandic Highlands, Tour du Mont Blanc, and alpine climbing and multipitch training in Chamonix and Italy.

I look forward to connecting with diverse partners for upcoming trips. If these adventures resonate with you, please get in touch. 📩

{% comment %}
  Travel logs: every file in _travel/ is listed here automatically, newest first.
  The heading only appears once there is at least one log.
{% endcomment %}
{% assign logs = site.travel | sort: "date" | reverse %}
{% if logs.size > 0 %}
## Travel Logs

{% for post in logs %}
  {% include archive-single.html %}
{% endfor %}
{% endif %}
