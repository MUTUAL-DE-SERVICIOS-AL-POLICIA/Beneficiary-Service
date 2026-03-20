# Beneficiary-Service

## Descripción

**Beneficiary-Service** es un microservicio especializado que gestiona la información de los beneficiarios y afiliados de la plataforma. Los beneficiarios son las personas que tienen cobertura o derechos a través de un afiliado (policía activo o jubilado), incluyendo cónyuge, hijos y otros dependientes que requieren servicios médicos o administrativos. Forma parte de una arquitectura de microservicios basada en **NestJS** y utiliza **NATS** para la comunicación asincrónica entre servicios.

Maneja datos como:
- Información personal de beneficiarios
- Gestión de documentos y expedientes
- Huellas dactilares y biometría
- Relaciones entre afiliados y beneficiarios
- Sincronización con sistemas FTP de almacenamiento

---

## Estructura del Proyecto

```
src/
├── app.module.ts                 # Módulo raíz que organiza todos los módulos de la aplicación
├── main.ts                       # Punto de entrada principal de la aplicación
├── beneficiary/                  # Módulo principal de gestión de beneficiarios
│   ├── controllers/              # Controladores que manejan rutas de beneficiarios
│   ├── services/                 # Servicios con la lógica de negocio
│   └── dto/                      # Data Transfer Objects para validación de datos
├── ftp/                          # Módulo de integración con servidor FTP
│   ├── ftp.service.ts            # Servicio para gestionar archivos en FTP
│   └── ftp.config.ts             # Configuración de conexión FTP
├── document/                     # Módulo de gestión de documentos
│   ├── controllers/              # Controladores de documentos
│   ├── services/                 # Servicios de validación y procesamiento
│   └── dto/                      # Validación de datos de documentos
├── common/                       # Código compartido reutilizable en toda la aplicación
│   ├── filters/                  # Filtros para manejo de excepciones
│   ├── guards/                   # Guards para proteger rutas
│   └── decorators/               # Decoradores personalizados
├── config/                       # Archivos de configuración (BD, variables ENV, etc)
│   └── database.config.ts        # Configuración específica de PostgreSQL
├── database/                     # Gestión de base de datos, migraciones y datos iniciales
│   ├── migrations/               # Migraciones TypeORM para cambios en el esquema BD
│   ├── seeds/                    # Seeders para llenar BD con datos de prueba
│   └── entities/                 # Entidades (modelos) que representan tablas de la BD
```

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