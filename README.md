# ANODEFLEX 5 nodos · 1 inyección

Aplicación web instalable para dimensionar y regular diez ramas ANODEFLEX distribuidas en cinco nodos de una red de protección catódica por corriente impresa.

## Topología

La fuente alimenta el nodo 1 mediante Rc1. Rc2 a Rc5 conectan los nodos consecutivos hasta el nodo 5. Cada nodo alimenta dos ramas en paralelo:

- Nodo 1: R11 + Reo11 y R12 + Reo12.
- Nodo 2: R21 + Reo21 y R22 + Reo22.
- Nodo 3: R31 + Reo31 y R32 + Reo32.
- Nodo 4: R41 + Reo41 y R42 + Reo42.
- Nodo 5: R51 + Reo51 y R52 + Reo52.

## Uso

1. Ingrese el voltaje, Rc1 a Rc5 y las diez corrientes medidas con los reóstatos en 0 Ω.
2. Pulse **Calcular resistencias**. La aplicación calcula y conserva las dos resistencias de cada nodo, desde R11 hasta R52.
3. Modifique el voltaje, los reóstatos o las corrientes objetivo. Los resultados se actualizan de inmediato.
4. Pulse **Calcular ajuste de reóstatos** para obtener los valores que producen las corrientes objetivo.
5. Revise corrientes de tramo, caídas, potencias y balances en **Detalles eléctricos**.

## Instalación

- **PC y Android:** abra la dirección en Chrome o Edge y seleccione la opción para instalarla.
- **iPhone:** abra la aplicación en Safari, toque **Compartir** y después **Añadir a pantalla de inicio**.

Los cálculos se ejecutan en el dispositivo. Los archivos esenciales quedan disponibles sin conexión después de la primera carga.

## Casos e informes

**Exportar caso** descarga un archivo JSON con la calibración, ajustes y resultados. **Importar caso** recupera un archivo de esta aplicación. **Imprimir informe** permite imprimir o guardar los resultados como PDF.

## Comprobaciones

El modelo verifica las leyes de corriente y tensión de Kirchhoff en los cinco nodos, el balance de potencia y la reproducción de las diez corrientes nominales.
