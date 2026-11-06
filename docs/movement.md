# Mover cercados e canteiros

Com a ferramenta **Explorar**, segure o abrigo, o animal ou o interior do cercado por **1,2 segundo** e depois arraste e solte no destino. A prévia leva a estrutura completa e os animais. Um toque curto continua abrindo a produção. Arrastar antes desse tempo move a câmera. O botão “Mover cercado” foi retirado da janela de produção.

O mesmo gesto funciona na casa, no celeiro, no silo e nos canteiros. Soltar sem arrastar após a pressão longa mantém o modo de posicionamento, permitindo escolher o destino por toque. **Cancelar**, Escape ou cancelamento do toque restauram o objeto sem salvar uma mudança.

Toque em um canteiro com **Explorar** e escolha **Mover**. A cultura e seu instante original de plantio são mantidos. Para escolher o lugar de um novo canteiro, use **Construções → Novo canteiro**; essa compra continua custando 5 moedas. Reposicionar é gratuito.

`Farm.penPositions` guarda a posição por espécie no servidor. Saves anteriores recebem as posições originais sem reiniciar recursos ou produção. Não há alteração nos IDs dos animais nem nos timers. A projeção dos cercados, a área de seleção, a origem das rotas dos animais e seus limites usam essas mesmas posições. Cada alteração reconstrói apenas as peças daquele sistema; navegar ou aguardar não recria cercas a cada frame.

Os comandos estritos `move-pen` e `move-field` passam pelo repositório transacional existente. O servidor valida rio, limites, áreas bloqueadas, caminhos, muros, obstáculos e todos os objetos posicionados, excluindo apenas o próprio objeto movido da colisão. O cliente apresenta a área válida em verde e a inválida em vermelho; a posição original permanece até a confirmação pelo servidor. O modo de posicionamento não planta nem colhe por engano.

Validação: `tests/movement.test.ts` verifica migração, colisões, preservação de recursos e timers, limites dos animais e comandos inválidos. `node --import tsx scripts/movement-visual.mjs` seleciona e move um cercado e um canteiro plantado pela interface real, confirma a nova seleção e recarrega a página para conferir o salvamento. `node --import tsx scripts/hold-move-check.mjs` verifica mouse e eventos reais de toque: toque curto, arrasto da câmera, pressão longa, prévia, soltura, persistência e cancelamento. Capturas em `docs/screenshots/hold-move-*.png`.
