src/
├─ main.ts
├─ app.module.ts
├─ app.controller.ts
├─ app.service.ts
├─ common/
│  ├─ decorators/
│  │  ├─ current-user.ts
│  │  └─ roles.decorator.ts
│  └─ guards/
│     ├─ jwt-auth.guard.ts
│     └─ roles.guard.ts
└─ modules/
   ├─ auth/
   │  ├─ dto/
   │  │  ├─ login.dto.ts
   │  │  └─ refresh.dto.ts
   │  ├─ auth.controller.ts
   │  ├─ auth.module.ts
   │  ├─ auth.service.ts
   │  └─ jwt.strategy.ts
   ├─ catalog/
   │  ├─ categories/
   │  │  ├─ dto/
   │  │  │  ├─ create-category.dto.ts
   │  │  │  └─ update-category.dto.ts
   │  │  ├─ categories.controller.ts
   │  │  ├─ categories.module.ts
   │  │  ├─ categories.service.ts
   │  │  ├─ category.entity.ts
   │  │  └─ category-translation.entity.ts
   │  └─ service-types/
   │     ├─ dto/
   │     │  ├─ create-service-type.dto.ts
   │     │  └─ update-service-type.dto.ts
   │     ├─ service-types.controller.ts
   │     ├─ service-types.module.ts
   │     ├─ service-types.service.ts
   │     ├─ service-type.entity.ts
   │     └─ service-type-translation.entity.ts
   ├─ providers/
   │  ├─ dto/
   │  │  ├─ update-provider-profile.dto.ts
   │  │  ├─ set-service-types.dto.ts
   │  │  └─ search-providers.dto.ts
   │  ├─ provider-profile.entity.ts
   │  ├─ provider-service-type.entity.ts
   │  ├─ providers.controller.ts
   │  ├─ providers.module.ts
   │  └─ providers.service.ts
   ├─ ragings/                      ← módulo de ratings
   │  ├─ dto/
   │  │  ├─ create-rating.dto.ts
   │  │  └─ list.dto.ts
   │  ├─ ratings.controller.ts
   │  ├─ ratings.module.ts
   │  ├─ ratings.service.ts
   │  └─ request-rating.entity.ts
   ├─ request/
   │  ├─ dto/
   │  │  ├─ create-request.dto.ts
   │  │  ├─ feed.dto.ts
   │  │  ├─ mine.dto.ts
   │  │  ├─ mine-summary.dto.ts
   │  │  ├─ transition.dto.ts
   │  │  └─ list-my.dto.ts
   │  ├─ request.entity.ts
   │  ├─ request-transition.entity.ts
   │  ├─ requests.controller.ts
   │  ├─ requests.module.ts
   │  └─ requests.service.ts
   └─ users/
      ├─ dto/
      │  ├─ create-user.dto.ts
      │  ├─ create-address.dto.ts
      │  └─ update-address.dto.ts
      ├─ user.entity.ts
      ├─ user-address.entity.ts
      ├─ users.controller.ts
      ├─ users.module.ts
      └─ users.service.ts

test/
├─ app.controller.spec.ts
└─ app.e2e-spec.ts

.env
jest-e2e.json
