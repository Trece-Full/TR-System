# TR System · Titanium Gym
Requisitos: Node 18+. `npm install && npm run dev` (la URL y la llave pública de Supabase ya están en `.env`).
Primer acceso: usuario `admin` (la contraseña es la definida en el requerimiento). Los recepcionistas se crean desde Empleados.
Seguridad: las lecturas pasan por RLS; las escrituras sensibles son funciones RPC (security definer) que validan rol y sucursal en la base de datos.
