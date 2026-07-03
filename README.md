![Status](https://img.shields.io/badge/status-in--development-orange)
## 🔗 Standalone JSON Explorer -> https://github.com/jsbeep/Json-explorer
# 🟢 MongoLive - MongoDB Live Dashboard
> *FireStore UI 4 MongoDB*
---
![video-1](https://github.com/user-attachments/assets/1709bf73-f992-4477-ad42-a1af3f287148)

## 🎯 왜
> Firebase 쓰다가 mongoDB compass 쓰려니 구림
```
Firebase 너무편한데 특히 실시간 데이터 감지

서버도 생겼겠다 대기업 손아귀에서 탈출하기 위해 서버 공부도 할겸 NoSQL 찾아보다 MongoDB 발견 너 잘걸렸다

근데 Firebase에 미련있어서 몽고 사용법 공부하며 겸사겸사 Firebase 비슷하게 UI 만들어보려 함
```

> MongoDB Compass: 
> - 컬렉션 하나하나에 문서 입력해야 함
> - 컬렉션의 재귀적 추가 불가-기존 컬렉션의 ID를 참조하는 방식으로 구현해야 함(Refernece)
> - 문서 편집하려면 모든 json 데이터 중 필요한 부분만 수정
> 
> Firestore DB: 
> - 재귀적으로 추가 가능, 직관적으로 원하는 데이터만 선택해서 편집 

> => 재귀적 인터렉션 기반 JSON 탐색으로 MongoDB에 직관 추가
---

## 🍴 맛보기
### 1. MongoDB 설치
### 2. MongoDB 서버열고
### 3. Replica Set 만드셈
[🔗 Mongodb Replica Set 구축하기](https://medium.com/@zzanzu/mongodb-replica-set-%EA%B5%AC%EC%B6%95%ED%95%98%EA%B8%B0-be7df973801d)
### 4. ```.env``` 설정
[🔗 샘플 확인](#env-기본-샘플)
### 5. ```npm i```
### 6. ```npm start``` + ```node server/server.js```
서버 두개여는거임

## 구조
#### 프론트엔드(client)
- 웹 렌더링 시 websocket으로 server에 접속
- 서버는 .env에서 설정한 IP의 express API임
- 사용자가 선택한 collection만 구독하는 방식으로 최적화
#### 백엔드
- 서버 상태 실시간 확인
- changeStream(MongoDB 제공)으로 mongoDB 데이터 감시
- 변화 감지 시 client에서 구독중인 부분만 쿼리 후 전송


## 추가예정
- [ ] 슬라이드 형식으로 갈기(explorer 2)
- [ ] DB/Document/Collection 추가/삭제/이동
- [ ] DB 새로고침
- [ ] 업데이트 내역 자세히
- [ ] 접속된 클라이언트 모니터링
- [ ] 기본 성능 지표 수집 (CPU, 메모리, 커넥션 수)
- [ ] 사용자 권한/로그인 시스템(mongoDB auth)

## 버그
- 컬렉션 한번에 선택안됨
- 단독 Referenced 안됨
- 배열 수정하면 터짐
- 수정하면 왜 depth 1로감
- depth 1에서 수정하면 이전 컬렉션 1단계로감 ????

### env 기본 샘플
```env
# MongoDB Live Server 환경 설정

# 기본 서버 설정
NODE_ENV=production
API_PORT=3001
HOST=xxx.xxx.xxx.xxx

# MongoDB 연결
MONGO_URL=mongodb://localhost:27017
# MONGO_ADMIN=mongodb://admin:password@localhost:27017/admin

# 보안 설정
ENABLE_IP_WHITELIST=true
IP_WHITELIST=127.0.0.1,::1,localhost,xxx.xxx.xxx.xxx
WHITELIST=http://localhost:3000,http://127.0.0.1:3000,http://xxx.xxx.xxx.xxx:3000
```
