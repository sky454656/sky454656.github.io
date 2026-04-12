---
layout: page
title: "BugBounty"
permalink: /categories/bugbounty/
category_name: "BugBounty"
---

{% assign posts = site.posts | where_exp: "post", "post.categories contains page.category_name" %}

## Posts

{% if posts.size > 0 %}
<ul>
  {% for post in posts %}
    <li><a href="{{ post.url | relative_url }}">{{ post.title }}</a></li>
  {% endfor %}
</ul>
{% else %}
이 카테고리의 포스트가 아직 없습니다.
{% endif %}
