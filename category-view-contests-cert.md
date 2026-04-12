---
layout: page
title: "공모전/자격증"
permalink: /category-view/contests-cert/
category_name: "공모전/자격증"
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
