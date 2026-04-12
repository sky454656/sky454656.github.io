---
layout: page
icon: fas fa-stream
order: 1
---

<style>
  .category-deck {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1rem;
    margin-top: 1.5rem;
  }

  .category-box {
    padding: 1.15rem;
    border: 1px solid var(--main-border-color);
    border-radius: 18px;
    background: linear-gradient(180deg, rgba(127, 140, 141, 0.08), rgba(127, 140, 141, 0.02));
  }

  .category-box h3 {
    margin-top: 0;
    margin-bottom: 0.55rem;
  }

  .category-box p {
    margin-bottom: 0;
  }
</style>

## 카테고리 구조

이 블로그는 아래 6개 카테고리를 중심으로 정리합니다.
포스트를 무작정 늘리기보다, 각 카테고리의 성격이 분명하게 보이도록 구성하는 것을 우선 기준으로 잡았습니다.

<div class="category-deck">
  <div class="category-box">
    <h3>개발</h3>
    <p>실습 도구, 자동화 스크립트, 환경 구성, 반복 작업 개선 기록</p>
  </div>
  <div class="category-box">
    <h3>CTF/Wargame</h3>
    <p>문제 풀이 흐름, 취약점 관찰 포인트, 익스플로잇 접근 메모</p>
  </div>
  <div class="category-box">
    <h3>BugBounty</h3>
    <p>리컨, 검증, 리포트 구성, 실제 제보 관점의 정리</p>
  </div>
  <div class="category-box">
    <h3>블로그/기술문서</h3>
    <p>문서 구조, 운영 방식, 학습 기록을 자산화하는 과정</p>
  </div>
  <div class="category-box">
    <h3>논문/컨퍼런스</h3>
    <p>연구 발표 요약, 핵심 아이디어 정리, 실무 연결 포인트 메모</p>
  </div>
  <div class="category-box">
    <h3>공모전/자격증</h3>
    <p>준비 일정, 회고, 포트폴리오와 연결되는 학습 로드맵 정리</p>
  </div>
</div>
