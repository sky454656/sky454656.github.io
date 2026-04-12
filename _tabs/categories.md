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
    padding: 1rem 1.1rem;
    border: 1px solid var(--main-border-color);
    border-radius: 16px;
    background: var(--card-bg);
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
    padding: 1rem 1.1rem;
    border: 1px dashed var(--main-border-color);
    border-radius: 16px;
    background: var(--card-bg);
  }
</style>

{% assign fixed_category_names = "개발|CTF/Wargame|BugBounty|블로그/기술문서|논문/컨퍼런스|공모전/자격증" | split: "|" %}

## Categories

<div class="fixed-categories">
  {% for category_name in fixed_category_names %}
    {% assign category_posts = site.categories[category_name] %}
    <div class="fixed-category">
      <h3>{{ category_name }}</h3>
      <p>{{ category_posts | size | default: 0 }} posts</p>
    </div>
  {% endfor %}
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
      <div class="other-category">
        <h3>{{ category_name }}</h3>
        <p>{{ category | last | size }} posts</p>
      </div>
    {% endunless %}
  {% endfor %}
</div>

{% if other_count == 0 %}
아직 다른 카테고리는 없습니다.
{% endif %}
