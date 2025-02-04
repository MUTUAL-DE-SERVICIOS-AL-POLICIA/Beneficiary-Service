<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="200" alt="Nest Logo" /></a>
</p>

1. Clonar proyecto
2. ```yarn install```
3. Clonar el archivo ```.env.template``` y renombrarlo a ```.env```
4. Cambiar las variables de entorno

5. Levantar: ```yarn start:dev```

## Seeders 
https://github.com/tada5hi/typeorm-extension

Los seeders usando typeORM pueden ser ejecutadas **una sola vez**, como las migraciones de Laravel, el registro de las migraciones se guarda en una tabla llamada *seeds.*

Para que los seeders se ejecuten una sola vez tienen que tener la opcion

Para crear un seeder:

```bash
yarn seed:create --name src/database/seeds/nombre-del-seeder.ts
```

El numeral unix podemos eliminarlo del nombre de la clase, pero no del nombre del archivo, ya que typeORM usa el mismo para guardar la información de ejecución en la base de datos.

---

Para ejecutar todos los seeders:

```bash
yarn seed:run
```

Para ejecutar un seeder:

```bash
 yarn seed:run --name src/database/seeds/nombre-del-seeder.ts
```

## Migración
# Crear migración
yarn typeorm migration:create src/database/migrations/NombreDeLaMigración
# Correr migración
yarn migration:run
# Revertir migración
yarn migration:revert
# Ver estado de migraciones
yarn migration:show