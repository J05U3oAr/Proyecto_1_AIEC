# Evaluaciones — M3

Carpeta reservada para el harness y datasets de M3. **No hay un runner implementado
aquí todavía.** Las pruebas unitarias no sustituyen las evals funcionales ni
adversariales contra el agente real.

Punto de partida: [guía para M3](../docs/integration/m3-libros-evals.md),
[reutilización HDT6](../docs/delivery/reutilizacion-evals.md) y casos iniciales en
`server/evaluation_cases.json`. Mantener los umbrales y criterios de
[la asignación](../docs/delivery/miembro-3-libros-evals.md).

M3 añadirá el comando del runner, versiones de datasets/configuración, casos
offline para CI y corridas reales acotadas, con consumo y todos los fallos.
Los reportes y capturas se documentan en `docs/evidence/`, sin secretos.
No mover los casos iniciales hasta adaptar y verificar sus consumidores.
