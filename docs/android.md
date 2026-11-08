# APK Android

O projeto Android principal fica em `android/`, ligado ao React/Vite da raiz por `capacitor.config.ts`. A pasta `mobile/` é apenas o scaffold criado anteriormente; não é usada na compilação deste jogo.

O APK de depuração abre o jogo e a API na URL informada, mantendo os cookies na mesma origem. A economia continua no servidor; não há modo offline. A orientação é `sensorLandscape`. As fontes PNG de arte não são empacotadas, pois o runtime usa WebP/SVG.

Compilação no PowerShell, com JDK 21 e Android SDK 36 disponíveis:

```powershell
.\scripts\build-apk.ps1 -ServerUrl "https://ENDERECO-DO-SEU-JOGO"
```

As ferramentas portáteis nesta máquina ficam em `.tools/`, ignoradas pelo Git. O script também aceita `JAVA_HOME` e `ANDROID_HOME` de uma instalação existente. O resultado é `artifacts/Farm-Valley-debug.apk`, assinado para testes, sem chave de publicação. A versão de produção para loja exige assinatura de release própria.

Para testes locais, use `http://192.168.1.6:5173` enquanto esse for o IP do computador. Execute `npm run dev`; computador e celular devem estar na mesma rede e o firewall precisa permitir a porta 5173 para a rede privada. Não há necessidade de abrir o banco PostgreSQL ao celular. Não desative o firewall inteiro. Se o IP mudar, recompile com o novo endereço.

Para jogar de qualquer rede, primeiro hospede conforme `hosting.md` e recompile com a URL HTTPS pública. A configuração de servidor é incorporada ao APK na sincronização, não contém senha do banco e não pode apontar para localhost do computador.

Primeiro APK gerado em 7 de novembro de 2026: `artifacts/Farm-Valley-debug.apk`, 8.344.470 bytes, assinatura APK v2 verificada, pacote `com.farmvalley.app`, Android mínimo API 24 e alvo API 36. SHA-256: `bf94b1817179e7e676bb2aa4fc184e09ca8fc8eea4493630815ab50a573c98c6`. Servidor de teste incorporado: `http://192.168.1.6:5173`. APK não testado em aparelho físico nesta etapa. O HTTP é habilitado somente no manifesto de depuração.
