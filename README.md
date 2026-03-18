# Beneficiary-Service

## Descripción

**Beneficiary-Service** es un microservicio que gestiona la información de los beneficiarios y afiliados de la plataforma. Los beneficiarios son las personas que tienen cobertura o derechos a través de un afiliado (policía activo o jubilado), incluyendo cónyuge, hijos y otros dependientes que requieren servicios médicos o administrativos.

Maneja datos como:
- Información personal de beneficiarios
- Gestión de documentos y expedientes
- Huellas dactilares y biometría
- Relaciones entre afiliados y beneficiarios

---

## Clonar el repositorio y agregarle un nombre nuevo del nuevo proyecto

```bash
git clone https://github.com/MUTUAL-DE-SERVICIOS-AL-POLICIA/Beneficiary-Service.git nombre-beneficiary-service
```

## Inicializar proyecto

```bash
# Entrar al repositorio clonado con el nuevo nombre del proyecto
cd nombre-beneficiary-service

# Elimina el origen remoto actual
git remote remove origin

# Crear el archivo .env en base al .env.template
cp .env.template .env

# Instalar las dependencias
pnpm install

# Correr proyecto en modo desarrollo
pnpm start:dev

# Crear nuevo Módulo
nest g res nombreModulo

# Crear un seeder
pnpm seed:create --name src/database/seeds/nombre_seed.ts

# Correr seeder
pnpm seed:run --name src/database/seeds/{code}-nombre_seed.ts

# Crear migración
pnpm typeorm migration:create src/database/migrations/NombreDeLaMigración

# Correr migración
pnpm migration:run

# Revertir migración
pnpm migration:revert

# Ver estado de migraciones
pnpm migration:show

# Para enlazar a un nuevo repositorio
git remote add origin https://github.com/tu-usuario/{nombre-beneficiary-service}.git
git add .
git commit -m "Inicialización del nuevo proyecto"
git branch -M main
git push -u origin main
```