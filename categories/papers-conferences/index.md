---
layout: page
title: "논문/컨퍼런스"
permalink: /categories/papers-conferences/
category_name: "논문/컨퍼런스"
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
