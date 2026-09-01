# 오더리

QR로 테이블 주문을 받고 사장 화면에서 주문, 테이블 메모, 매출을 관리하는 개인 프로젝트입니다.

## 로컬 미리보기

```bash
npm install
npm run dev
```

DB 연결 전에는 데모 데이터로 작동하며 사장 접근 번호는 `1234`입니다.

## Vercel 배포

1. 이 폴더를 개인 GitHub 저장소에 올리고 Vercel Hobby 프로젝트로 가져옵니다.
2. Vercel Marketplace에서 Neon Postgres 무료 DB를 연결합니다.
3. `npm run hash-pin -- 원하는번호`로 만든 값을 `OWNER_PIN_HASH`에 저장합니다.
4. `SESSION_SECRET`에는 32자 이상의 임의 문자열을 저장합니다.
5. `NEXT_PUBLIC_SITE_URL`에는 배포 주소를 저장합니다.
6. Neon SQL 편집기에서 `db/schema.sql`을 실행하거나, 연결 정보를 둔 상태에서 `npm run db:setup`을 실행합니다.

테이블별 주소는 `/order/table-1`부터 `/order/table-8`까지입니다. 실제 운영 전에는 `db/schema.sql`의 `qr_token`을 긴 임의 문자열로 교체하세요.

