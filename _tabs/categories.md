---
layout: page
icon: fas fa-stream
order: 1
---

<style>
  .fixed-categories {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1rem;
    margin-top: 1.5rem;
    margin-bottom: 2rem;
  }

  .fixed-category {
    display: block;
    padding: 1rem 1.1rem;
    border: 1px solid var(--main-border-color);
    border-radius: 16px;
    background: var(--card-bg);
    color: inherit;
    text-decoration: none;
  }

  .fixed-category h3 {
    margin: 0 0 0.35rem;
    font-size: 1rem;
  }

  .fixed-category p {
    margin: 0;
    color: var(--text-muted-color);
    font-size: 0.95rem;
  }

  .other-categories {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1rem;
    margin-top: 1rem;
  }

  .other-category {
    display: block;
    padding: 1rem 1.1rem;
    border: 1px dashed var(--main-border-color);
    border-radius: 16px;
    background: var(--card-bg);
    color: inherit;
    text-decoration: none;
  }
</style>

{% assign fixed_category_names = "개발|CTF/Wargame|BugBounty|블로그/기술문서|논문/컨퍼런스|공모전/자격증" | split: "|" %}

## Categories

<div class="fixed-categories">
  <a class="fixed-category" href="{{ '/categories/dev/' | relative_url }}">
    <h3>개발</h3>
    <p>{{ site.categories['개발'] | size | default: 0 }} posts</p>
  </a>
  <a class="fixed-category" href="{{ '/categories/ctf-wargame/' | relative_url }}">
    <h3>CTF/Wargame</h3>
    <p>{{ site.categories['CTF/Wargame'] | size | default: 0 }} posts</p>
  </a>
  <a class="fixed-category" href="{{ '/categories/bugbounty/' | relative_url }}">
    <h3>BugBounty</h3>
    <p>{{ site.categories['BugBounty'] | size | default: 0 }} posts</p>
  </a>
  <a class="fixed-category" href="{{ '/categories/blog-docs/' | relative_url }}">
    <h3>블로그/기술문서</h3>
    <p>{{ site.categories['블로그/기술문서'] | size | default: 0 }} posts</p>
  </a>
  <a class="fixed-category" href="{{ '/categories/papers-conferences/' | relative_url }}">
    <h3>논문/컨퍼런스</h3>
    <p>{{ site.categories['논문/컨퍼런스'] | size | default: 0 }} posts</p>
  </a>
  <a class="fixed-category" href="{{ '/categories/contests-cert/' | relative_url }}">
    <h3>공모전/자격증</h3>
    <p>{{ site.categories['공모전/자격증'] | size | default: 0 }} posts</p>
  </a>
</div>

<h2>Other Categories</h2>

<div class="other-categories">
  {% assign other_count = 0 %}
  {% for category in site.categories %}
    {% assign category_name = category | first %}
    {% assign is_fixed = false %}
    {% for fixed_name in fixed_category_names %}
      {% if category_name == fixed_name %}
        {% assign is_fixed = true %}
        {% break %}
      {% endif %}
    {% endfor %}
    {% unless is_fixed %}
      {% assign other_count = other_count | plus: 1 %}
      <a class="other-category" href="{{ '/categories/' | append: category_name | slugify | append: '/' | relative_url }}">
        <h3>{{ category_name }}</h3>
        <p>{{ category | last | size }} posts</p>
      </a>
    {% endunless %}
  {% endfor %}
</div>

{% if other_count == 0 %}
아직 다른 카테고리는 없습니다.
{% endif %}
