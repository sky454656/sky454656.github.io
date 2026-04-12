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
</style>

## Categories

포스트가 아직 없어도 아래 6개 카테고리가 먼저 보이도록 고정해둡니다.

<div class="fixed-categories">
  <div class="fixed-category">
    <h3>개발</h3>
    <p>0 posts</p>
  </div>
  <div class="fixed-category">
    <h3>CTF/Wargame</h3>
    <p>0 posts</p>
  </div>
  <div class="fixed-category">
    <h3>BugBounty</h3>
    <p>0 posts</p>
  </div>
  <div class="fixed-category">
    <h3>블로그/기술문서</h3>
    <p>0 posts</p>
  </div>
  <div class="fixed-category">
    <h3>논문/컨퍼런스</h3>
    <p>0 posts</p>
  </div>
  <div class="fixed-category">
    <h3>공모전/자격증</h3>
    <p>0 posts</p>
  </div>
</div>
