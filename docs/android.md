# APK Android

Atualização 1.0.1 (versionCode 2): usa `https://farm-valley.onrender.com`, sem depender do computador ou da mesma rede Wi-Fi. Arquivo: `artifacts/Farm-Valley-online.apk`. Continua sendo uma compilação de depuração assinada para instalação e testes; não é um pacote de publicação na Play Store. Os registros abaixo da primeira versão local são históricos.

APK online gerado em 8 de novembro de 2026: 8.420.786 bytes; assinatura v2 verificada; SHA-256 `0858135b73b16d4ff49bf95bc95d2e7d02d8868c7075fcb47facfd02d7b8bc34`. A URL HTTPS e ausência de arquivos `.env` foram verificadas no APK. O teste completo de navegador passou no servidor público com `FARM_EXPECT_STORAGE=postgres`. Instalação em aparelho físico ainda não foi testada nesta etapa.

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
