---
layout: page
title: "논문/컨퍼런스"
permalink: /category-view/papers-conferences/
category_name: "논문/컨퍼런스"
---

## Posts

{% assign post_count = 0 %}
<ul>
  {% for post in site.posts %}
    {% if post.categories contains page.category_name %}
      {% assign post_count = post_count | plus: 1 %}
      <li><a href="{{ post.url | relative_url }}">{{ post.title }}</a></li>
    {% endif %}
  {% endfor %}
</ul>
{% if post_count == 0 %}
이 카테고리의 포스트가 아직 없습니다.
{% endif %}
