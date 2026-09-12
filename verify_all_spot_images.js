import fs from 'fs';

// Let's create an updated preview page with labels matching the textbook text
const textbookImageMap = [
  // 1. 몽블랑산 (알프스산맥): Textbook Page 10 Figure 1 -> 10p_2.jpg (Photo of Mont Blanc)
  {
    spotId: 'landform_montblanc',
    name: '몽블랑산 (알프스산맥)',
    primary: '/교과서 이미지/초등_사회 6-2_1_교과서_10p_2.jpg',
    extra: ['/교과서 이미지/초등_사회 6-2_1_교과서_12p_2.jpg', '/교과서 이미지/초등_사회 6-2_1_교과서_13p_1.jpg'],
    pageRef: '10쪽 1번 몽블랑산 (해발 4,807m)'
  },
  // 2. 사하라 사막: Textbook Page 10 Figure 2 -> 10p_3.jpg
  {
    spotId: 'landform_sahara',
    name: '사하라 사막',
    primary: '/교과서 이미지/초등_사회 6-2_1_교과서_10p_3.jpg',
    extra: ['/교과서 이미지/초등_사회 6-2_1_교과서_27p_2.jpg'],
    pageRef: '10쪽 2번 사하라 사막'
  },
  // 3. 몽골 초원: Textbook Page 10 Figure 3 -> 10p_4.jpg
  {
    spotId: 'landform_mongolia',
    name: '몽골 초원',
    primary: '/교과서 이미지/초등_사회 6-2_1_교과서_10p_4.jpg',
    extra: ['/교과서 이미지/초등_사회 6-2_1_교과서_38p_6.jpg'],
    pageRef: '10쪽 3번 몽골 초원'
  },
  // 4. 콜로라도강: Textbook Page 11 Figure 4 -> 11p_1.jpg
  {
    spotId: 'landform_colorado',
    name: '콜로라도강',
    primary: '/교과서 이미지/초등_사회 6-2_1_교과서_11p_1.jpg',
    extra: ['/교과서 이미지/초등_사회 6-2_1_교과서_8p_1.jpg'],
    pageRef: '11쪽 4번 콜로라도강'
  },
  // 5. 칸쿤 해변: Textbook Page 11 Figure 5 -> 11p_2.jpg
  {
    spotId: 'landform_cancun',
    name: '칸쿤 해변',
    primary: '/교과서 이미지/초등_사회 6-2_1_교과서_11p_2.jpg',
    extra: ['/교과서 이미지/초등_사회 6-2_1_교과서_12p_1.jpg'],
    pageRef: '11쪽 5번 칸쿤 해변'
  },
  // 6. 페리토모레노 빙하: Textbook Page 11 Figure 6 -> 11p_3.jpg
  {
    spotId: 'landform_perito',
    name: '페리토모레노 빙하',
    primary: '/교과서 이미지/초등_사회 6-2_1_교과서_11p_3.jpg',
    pageRef: '11쪽 6번 페리토모레노 빙하'
  },
  // 7. 아비시니아고원: Textbook Page 12 Figure 2 -> 12p_2.jpg
  {
    spotId: 'landform_abyssinia',
    name: '아비시니아고원',
    primary: '/교과서 이미지/초등_사회 6-2_1_교과서_12p_2.jpg',
    pageRef: '12쪽 2번 아비시니아고원'
  },
  // 8. 마우나로아 화산: Textbook Page 12 Figure 3 -> 12p_4.jpg
  {
    spotId: 'landform_maunaloa',
    name: '마우나로아 화산',
    primary: '/교과서 이미지/초등_사회 6-2_1_교과서_12p_4.jpg',
    pageRef: '12쪽 3번 마우나로아 화산'
  },
  // 9. 마추픽추 (안데스 산지): Textbook Page 13 Figure 2 -> 13p_2.jpg
  {
    spotId: 'landform_machupicchu',
    name: '마추픽추 (안데스 산지)',
    primary: '/교과서 이미지/초등_사회 6-2_1_교과서_13p_2.jpg',
    extra: ['/교과서 이미지/초등_사회 6-2_1_교과서_13p_1.jpg', '/교과서 이미지/초등_사회 6-2_1_교과서_13p_3.jpg'],
    pageRef: '13쪽 마추픽추 고대 도시 & 알파카'
  },
  // 10. 열대 기후: Textbook Page 27 Figure 1 & Page 28 -> 27p_1.jpg (열대 우림) & 28p_2.jpg (고상 가옥)
  {
    spotId: 'climate_tropical',
    name: '열대 기후 (밀림 & 고상가옥)',
    primary: '/교과서 이미지/초등_사회 6-2_1_교과서_27p_1.jpg',
    extra: ['/교과서 이미지/초등_사회 6-2_1_교과서_28p_2.jpg', '/교과서 이미지/초등_사회 6-2_1_교과서_28p_1.jpg'],
    pageRef: '27쪽 1번 열대 우림 & 28쪽 고상 가옥'
  },
  // 11. 건조 기후: Textbook Page 27 Figure 2 & Page 29/30 -> 27p_2.jpg (건조 사막) & 30p_1.jpg (흙벽돌집)
  {
    spotId: 'climate_dry',
    name: '건조 기후 (사막 & 흙벽돌집)',
    primary: '/교과서 이미지/초등_사회 6-2_1_교과서_27p_2.jpg',
    extra: ['/교과서 이미지/초등_사회 6-2_1_교과서_30p_1.jpg'],
    pageRef: '27쪽 2번 건조 기후 & 30쪽 흙벽돌집'
  },
  // 12. 온대 기후: Textbook Page 32 Figure 2 -> 32p_2.jpg (서유럽 밀농사) & 32p_3.jpg (지중해 가옥/동아시아 벼농사)
  {
    spotId: 'climate_temperate',
    name: '온대 기후 (농업 & 가옥)',
    primary: '/교과서 이미지/초등_사회 6-2_1_교과서_32p_2.jpg',
    extra: ['/교서 이미지/초등_사회 6-2_1_교과서_32p_3.jpg', '/교과서 이미지/초등_사회 6-2_1_교과서_31p_1.jpg'],
    pageRef: '32쪽 서유럽 밀농사 & 지중해 가옥'
  },
  // 13. 냉대 기후: Textbook Page 33 & 34 -> 33p_1.jpg (타이가 침엽수림) & 42p_5.jpg (통나무집)
  {
    spotId: 'climate_boreal',
    name: '냉대 기후 (타이가 침엽수림 & 통나무집)',
    primary: '/교과서 이미지/초등_사회 6-2_1_교과서_33p_1.jpg',
    extra: ['/교과서 이미지/초등_사회 6-2_1_교과서_42p_5.jpg'],
    pageRef: '33쪽 타이가 침엽수림 & 통나무집'
  },
  // 14. 한대 기후: Textbook Page 35 Figure 3 & 2 -> 35p_3.jpg (그린란드 고상 가옥) & 35p_2.jpg (이누이트 털옷) & 35p_4.jpg (순록)
  {
    spotId: 'climate_polar',
    name: '한대 기후 (그린란드 고상가옥 & 툰드라/털옷)',
    primary: '/교과서 이미지/초등_사회 6-2_1_교과서_35p_3.jpg',
    extra: ['/교과서 이미지/초등_사회 6-2_1_교과서_35p_2.jpg', '/교과서 이미지/초등_사회 6-2_1_교과서_35p_4.jpg', '/교과서 이미지/초등_사회 6-2_1_교과서_35p_5.jpg'],
    pageRef: '35쪽 고상 가옥, 이누이트 털옷, 순록 유목'
  },
  // 15. 고산 기후: Textbook Page 36 Figure 4 & 5 -> 36p_4.jpg (볼리비아 라파스 고산도시) & 36p_5.jpg (페루 쿠스코 원주민 판초) & 36p_2.jpg (옥수수밭)
  {
    spotId: 'climate_highland',
    name: '고산 기후 (볼리비아 라파스 & 페루 쿠스코 원주민)',
    primary: '/교과서 이미지/초등_사회 6-2_1_교과서_36p_4.jpg',
    extra: ['/교과서 이미지/초등_사회 6-2_1_교과서_36p_5.jpg', '/교과서 이미지/초등_사회 6-2_1_교과서_36p_2.jpg'],
    pageRef: '36쪽 볼리비아 라파스 & 쿠스코 원주민'
  }
];

console.log('Mapping verification list count:', textbookImageMap.length);
textbookImageMap.forEach(item => {
  console.log(`[${item.spotId}] ${item.name}:`);
  console.log(`   Primary: ${item.primary}`);
  if (item.extra) console.log(`   Extra (${item.extra.length}): ${item.extra.join(', ')}`);
});
