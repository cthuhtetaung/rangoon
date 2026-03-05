#!/bin/bash

cd /Users/sithu/Downloads/CafeManage/server/src

# Create module directories
mkdir -p modules/{auth,users,branches,products,orders,pos,reservations,inventory,payments,promotions,reports,kds,salon,ktv,staff,commission,expense,purchase,dashboard}/{entities,dto,controllers,services}
mkdir -p common/{decorators,guards,pipes,filters,interceptors}
mkdir -p migrations

# Create stub module.ts files for each module
for module in auth users branches products orders pos reservations inventory payments promotions reports kds salon ktv staff commission expense purchase dashboard; do
  mkdir -p modules/$module
  cat > modules/$module/${module}.module.ts << MODEOF
import { Module } from '@nestjs/common';
import { ${module^}Service } from './${module}.service';
import { ${module^}Controller } from './${module}.controller';

@Module({
  controllers: [${module^}Controller],
  providers: [${module^}Service],
})
export class ${module^}Module {}
MODEOF
done

echo "✅ Module structure created successfully!"
