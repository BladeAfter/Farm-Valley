# Caminhão de encomendas

O caminhão original do Farm Valley fica estacionado na estrada perto da casa. Tocar nele abre o mural existente. Um pedido com estoque completo pode ser carregado e enviado. O caminhão mostra caixas no carregamento, sai pela estrada, fica fora da fazenda e retorna na direção oposta.

O servidor registra `orderBoard.truck` com ID do pedido, saída e retorno. A viagem dura 45 segundos: 1,5 s carregando, 5 s saindo, 32,5 s fora e 6 s retornando. O cliente deriva a posição do relógio sincronizado; não usa temporizadores para conceder recursos. Reabrir o jogo durante a viagem restaura a fase correta; após o prazo, o caminhão fica disponível sem exigir coleta ou comando extra.

Produtos são consumidos e moedas/XP pagos uma única vez na confirmação do envio, preservando os valores anteriores. Enquanto o caminhão está fora, outro envio é rejeitado no servidor, inclusive pelo endpoint legado. Descartar pedidos continua permitido e não concede recompensas. Os salvamentos antigos sem o campo de viagem iniciam com o caminhão estacionado.

Arte original criada com a skill imagegen e a ferramenta de imagens integrada: caminhonete rural verde-menta/creme, carroceria de madeira e caixas de produtos, perspectiva isométrica 2:1, vistas frontal sudoeste e traseira nordeste. Uma segunda edição removeu a névoa ao redor das silhuetas. Fontes PNG e WebP de runtime em `public/assets/vehicles/delivery-truck`. `scripts/assets/prepare-truck.py` apenas recorta as duas células e reduz para 256 px; o mapa as exibe a 91 px de largura. Não foram usados assets de outros jogos.

Validação: `tests/delivery-truck.test.ts`, suíte completa e build; `node scripts/truck-visual.mjs` confere envio real, bloqueio durante viagem, recarregamento, recompensa única, retorno e layout mobile. Capturas: `truck-idle.png`, `truck-departing.png`, `truck-returning.png`.

A rota é fixa na estrada atual; o caminhão não é uma construção comprável/movível. O tempo de viagem é configurável em `orderRules.truckTravelMs`. A persistência usa o adaptador configurado do servidor; esta etapa não ativa a conexão Supabase ainda sem senha.
