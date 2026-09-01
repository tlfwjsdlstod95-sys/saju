// lib/reviews.ts 단위 테스트 (Supabase 미설정 상태 = 익명·무해 동작 확인 포함)
//   실행: npx tsx scripts/test-reviews.ts

import {
  cleanText, looksLikeSpam, reviewId, ipHash,
  submitReview, listPublicReviews, listAllReviews, setReviewStatus, publicReviewStats,
  BODY_MIN, BODY_MAX, NICK_MAX,
} from '../lib/reviews';

let pass = 0, fail = 0;
function t(name: string, cond: boolean) {
  if (cond) { pass++; console.log('  PASS ' + name); }
  else { fail++; console.log('  FAIL ' + name); }
}

async function main() {
  console.log('\n[cleanText]');
  t('공백 정리', cleanText('  안녕   하세요  ', 100) === '안녕 하세요');
  t('줄바꿈 접기', cleanText('한 줄\n두 줄', 100) === '한 줄 두 줄');
  t('탭 접기', cleanText('가\t나', 100) === '가 나');
  t('길이 제한', cleanText('가'.repeat(500), BODY_MAX).length === BODY_MAX);
  t('닉 길이 제한', cleanText('나'.repeat(50), NICK_MAX).length === NICK_MAX);
  t('null 안전', cleanText(null, 10) === '' && cleanText(undefined, 10) === '');
  t('숫자 입력 안전', cleanText(12345, 10) === '12345');
  t('최소 길이 상수', BODY_MIN >= 2 && BODY_MAX > BODY_MIN);

  console.log('\n[looksLikeSpam]');
  t('정상 후기 통과', looksLikeSpam('일주 설명이 저랑 비슷해서 놀랐어요') === false);
  t('http 링크 차단', looksLikeSpam('여기 보세요 http://spam.io'));
  t('www 차단', looksLikeSpam('www.example 에서 상담'));
  t('.com 차단', looksLikeSpam('abc.com 방문'));
  t('오픈채팅 차단', looksLikeSpam('오픈채팅 오세요'));
  t('전화번호 차단', looksLikeSpam('연락주세요 010-1234-5678'));
  t('점수 표기 오탐 없음', looksLikeSpam('별 5점 만점에 5점') === false);

  console.log('\n[id / hash]');
  t('id 결정론', reviewId('a'.repeat(16), 'kakao:1') === reviewId('a'.repeat(16), 'kakao:1'));
  t('작성자 다르면 id 다름', reviewId('a'.repeat(16), 'kakao:1') !== reviewId('a'.repeat(16), 'kakao:2'));
  t('명식 다르면 id 다름', reviewId('a'.repeat(16), 'x') !== reviewId('b'.repeat(16), 'x'));
  t('ip 해시 16자', ipHash('1.2.3.4').length === 16);
  t('ip 해시 결정론', ipHash('1.2.3.4') === ipHash('1.2.3.4'));
  t('다른 ip = 다른 해시', ipHash('1.2.3.4') !== ipHash('1.2.3.5'));
  t('원문 ip 미포함', !ipHash('1.2.3.4').includes('1.2.3.4'));

  console.log('\n[Supabase 미설정 시 무해 동작]');
  const saved = await submitReview({
    chart: 'a'.repeat(16), who: 'ip:x', userId: null, rating: 5,
    body: '테스트', nickname: '', tier: 'free', engine: 5, consent: false, ipHashValue: 'x',
  });
  t('저장 실패를 throw 없이 알림', saved.ok === false && saved.reason === 'db');
  t('공개 목록 빈 배열', (await listPublicReviews()).length === 0);
  t('전체 목록 빈 배열', (await listAllReviews()).length === 0);
  t('상태 변경 false', (await setReviewStatus('x', 'public')) === false);
  const st = await publicReviewStats();
  t('통계 0건', st.count === 0 && st.avg === 0);

  console.log(`\n결과: ${pass} PASS / ${fail} FAIL`);
  if (fail > 0) process.exit(1);
}

main();
