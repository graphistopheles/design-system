# Tokens de componente (capa 3)

Esta capa es **opcional** y está vacía a propósito: solo existe para excepciones puntuales
que ningún semántico resuelve (fórmula `{componente}-{variante}-{propiedad}-{estado}`).

Antes de crear un token aquí, pregunta: ¿el caso lo resuelve un semántico existente?
¿Debería existir un semántico nuevo que otros componentes también usarían? Si la respuesta
a cualquiera es sí, el token va en `/specs/tokens/semantic`. Toda excepción requiere un ADR.

Formato: DTCG, y cada valor debe ser un alias a un token **semántico**, nunca a un primitivo.
