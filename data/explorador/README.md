# Explorador global

La app sirve esta carpeta mediante el publicDir de Vite. Para habilitar los datos
en otra máquina, copiar global-terreno.js desde el espacio compartido del equipo
a esta carpeta antes de ejecutar el build. El archivo pesa 33 MB y está excluido
de Git. Contiene los modelos MOLA, LOLA y ETOPO de la corrida exploratoria.

El explorador calcula un ranking regional separado de los perfiles de misión.
El zoom amplía la grilla existente. Este visor todavía no incorpora teselas de
mayor detalle ni terreno con geometría 3D.
