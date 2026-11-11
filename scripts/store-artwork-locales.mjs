// Copy for the approved four-image layout, in the extension's supported locales.
// Order: details, manual lookup, settings, availability.
export default {
  tr: {
    name: 'Türkçe', region: 'tr-TR', footer: 'Firefox eklentisi', lookup: 'WHOIS ve RDAP ile alan adı sorgulama', registrar: 'Örnek Kayıt Kuruluşu',
    uiCopy: {
      dateFormatHelp: 'Otomatik seçeneği, tarayıcının bölgesel tarih biçimini kullanır. Hangi dili veya biçimi seçersen seç, tarihler cihazının saat dilimine göre gösterilir.',
      extensionDescription: 'Merak ettiğin alan adının kayıt kuruluşunu, kayıt tarihlerini, ad sunucularını ve durumunu Firefox üzerinden öğren.',
      domainLabel: 'Alan adı veya web adresi',
      invalidDomain: 'Geçerli bir alan adı ya da http:// veya https:// ile başlayan bir web adresi gir.',
      settingsIntro: 'Dilini ve kayıt kuruluşunu seç, kaydedilen sorgu verilerini yönet.',
      languageHelp: 'Bu seçim yalnızca bu pencerenin dilini değiştirir. Araç çubuğundaki metinler tarayıcının dilinde kalır.',
      registrarHelp: 'Alan adı boşta görünüyorsa, kontrol düğmesi bu kayıt kuruluşunun sitesini açar.',
      availability: 'Alan adı boşta mı?',
      possiblyAvailable: 'Boşta olabilir',
      availabilityHelp: 'Kayıt bilgisi bulunamadı. Alan adının boşta olup olmadığını kayıt kuruluşunun sitesinden kontrol et.',
      unsupported: 'Bir alan adı gir ya da sorgulamak istediğin web sitesini aç.',
      registryError: 'Sicil kuruluşundan yanıt alınamadı ($1). Biraz sonra tekrar dene.',
      whoisError: 'WHOIS hizmetinden yanıt alınamadı ($1). Biraz sonra tekrar dene.',
      lookupFailed: 'Sorgu tamamlanamadı. Tekrar dene.'
    },
    views: [
      ['ALAN ADINI YAKINDAN TANI', 'Alan adı bilgileri,<br><em>tek tıkla.</em>', 'Alan adının kayıt kuruluşunu, kayıt tarihini<br>ve süresinin ne zaman dolacağını öğren.', ['Kayıt kuruluşu ve önemli tarihler', 'Ad sunucuları ve alan adının durumu'], 'Alan adı bilgileri Firefox’ta elinin altında.', 'Ekrandaki kayıt bilgileri örnektir'],
      ['SİTEYİ AÇMADAN DA SORGULAYABİLİRSİN', 'Merak ettiğin adı<br><em>hemen sorgula.</em>', 'Alan adını yaz ya da web adresini yapıştır.<br>Sorgulamak için siteyi açmana gerek yok.', ['Açık sekmedeki alan adını otomatik tanır', 'Kalem simgesine tıklayarak başka bir ad sorgula'], 'Sekme değiştirmeden yeni bir alan adı sorgula.', 'Ekrandaki kayıt bilgileri örnektir'],
      ['KULLANIMI SANA GÖRE OLSUN', 'Nasıl istersen,<br><em>öyle kullan.</em>', 'Dilini ve tarih biçimini seç, sık kullandığın<br>kayıt kuruluşunu ayarla.', ['Türkçe dahil 7 dil seçeneği', 'Kaydedilen sorgu verilerini istediğin zaman sil'], 'İhtiyacın olan ayarlar tek yerde.', 'Türkçe görünüm'],
      ['BU ALAN ADI HÂLÂ ALINABİLİR Mİ?', 'Aklındaki ad<br><em>hâlâ boşta mı?</em>', 'Kayıt bilgisi bulunamadıysa, boşta olup<br>olmadığını kayıt kuruluşundan kontrol et.', ['10 kayıt kuruluşu arasından seçim yap', 'Kesin sonucu kayıt kuruluşundan öğren'], 'Beğendiğin adın boşta olup olmadığını öğren.', 'Örnek gösterimdir; güncel müsaitlik bilgisi değildir']
    ]
  },
  de: {
    name: 'Deutsch', region: 'de-DE', footer: 'Firefox-Erweiterung', lookup: 'Domainabfrage mit WHOIS und RDAP', registrar: 'Beispiel-Registrar',
    uiCopy: {
      settingsIntro: 'Sprache, Registrierungsanbieter und gespeicherte Abfragen verwalten.',
      dateFormatHelp: 'Bei „Automatisch“ gilt das regionale Datumsformat des Browsers. Die lokale Zeitzone bleibt in allen Formaten erhalten – unabhängig von der gewählten Sprache.',
      languageHelp: 'Die Auswahl gilt für dieses Popup. In der Symbolleiste wird weiterhin die Browsersprache verwendet.',
      registrarHelp: 'Wenn eine Domain möglicherweise frei ist, führt die Schaltfläche zu diesem Anbieter.',
      availabilityHelp: 'Es wurde kein Registrierungseintrag gefunden. Ob die Domain tatsächlich frei ist, erfährst du beim Registrar.'
    },
    views: [
      ['DAS STECKT HINTER DER DOMAIN', 'Domaindaten.<br>Auf einen <em>Blick.</em>', 'Wo ist die Domain registriert? Seit wann?<br>Und wann läuft die Registrierung ab?', ['Registrar und wichtige Termine', 'Nameserver und aktueller Domainstatus'], 'Direkt über die Firefox-Symbolleiste.', 'Registrierungsdaten als Beispiel'],
      ['DOMAIN EINGEBEN, DATEN ABRUFEN', 'Andere Domain?<br>Einfach <em>eingeben.</em>', 'Domain eintippen oder eine Webadresse einfügen.<br>Dafür musst du die Website nicht erst öffnen.', ['Erkennt die Domain im geöffneten Tab', 'Andere Domains über das Stiftsymbol abfragen'], 'Die nächste Abfrage ist nur einen Klick entfernt.', 'Registrierungsdaten als Beispiel'],
      ['DEINE EINSTELLUNGEN', 'So, wie es<br>für dich <em>passt.</em>', 'Sprache und Datumsformat festlegen<br>und deinen bevorzugten Registrar auswählen.', ['In 7 Sprachen nutzbar', 'Gespeicherte Abfragen bei Bedarf löschen'], 'Alles Wichtige an einem Ort einstellen.', 'Ansicht auf Deutsch'],
      ['IST DER WUNSCHNAME NOCH FREI?', 'Name gefunden?<br>Jetzt <em>prüfen.</em>', 'Kein Registrierungseintrag vorhanden?<br>Prüfe beim Registrar, ob die Domain noch frei ist.', ['Aus 10 Registraren wählen', 'Verbindliche Auskunft gibt der Registrar'], 'Vom passenden Namen zur Verfügbarkeitsprüfung.', 'Beispielanzeige, keine Live-Prüfung']
    ]
  },
  es: {
    name: 'Español', region: 'es-ES', footer: 'Extensión para Firefox', lookup: 'Información de dominios con WHOIS y RDAP', registrar: 'Registrador de ejemplo',
    uiCopy: {
      domainLabel: 'Dominio o dirección web',
      settingsIntro: 'Elige el idioma y el registrador que prefieras, y gestiona los datos guardados.',
      dateFormatHelp: 'La opción automática usa el formato regional del navegador. Las fechas siempre se muestran en tu zona horaria, sea cual sea el idioma de la interfaz.',
      languageHelp: 'Este ajuste solo cambia el idioma de esta ventana. La barra de herramientas mantiene el idioma del navegador.',
      registrarHelp: 'Cuando un dominio pueda estar libre, el botón te llevará a este registrador.',
      availabilityHelp: 'No hay datos de registro. Consulta con el registrador si el dominio está realmente disponible.'
    },
    views: [
      ['CONOCE LOS DATOS DEL DOMINIO', 'Toda la información,<br><em>a un clic.</em>', 'Consulta dónde está registrado el dominio,<br>cuándo se creó y cuándo caduca.', ['Registrador y fechas clave', 'Servidores DNS y estado del dominio'], 'Consúltalo sin salir de Firefox.', 'Ejemplo con datos de muestra'],
      ['BUSCA SIN VISITAR LA WEB', '¿Otro dominio?<br><em>Consúltalo aquí.</em>', 'Introduce el dominio o pega su dirección web.<br>No hace falta abrir la página para consultarlo.', ['Reconoce el dominio de la pestaña activa', 'Usa el lápiz para consultar otro dominio'], 'Consulta el dominio que quieras, desde cualquier pestaña.', 'Ejemplo con datos de muestra'],
      ['PONLO A TU GUSTO', 'Configúralo<br><em>a tu manera.</em>', 'Escoge el idioma, cómo se muestran las fechas<br>y el registrador que prefieras.', ['Disponible en 7 idiomas', 'Borra los datos guardados cuando quieras'], 'Tus ajustes, todos en el mismo sitio.', 'Vista de la interfaz en español'],
      ['¿SIGUE LIBRE ESE DOMINIO?', '¿Tienes un nombre?<br><em>Compruébalo.</em>', 'Si no aparecen datos de registro, consulta<br>con el registrador si todavía puedes registrarlo.', ['Elige entre 10 registradores', 'La disponibilidad la confirma el registrador'], 'El siguiente paso para tu idea.', 'Ejemplo de consulta, no de disponibilidad real']
    ]
  },
  fr: {
    name: 'Français', region: 'fr-FR', footer: 'Extension pour Firefox', lookup: 'Consultation WHOIS et RDAP', registrar: 'Prestataire fictif',
    uiCopy: {
      domainLabel: 'Nom de domaine ou adresse web',
      settingsIntro: 'Réglez la langue, choisissez votre prestataire et gérez les données en cache.',
      dateFormatHelp: 'Le réglage automatique reprend le format régional du navigateur. Les dates restent dans votre fuseau horaire, quelle que soit la langue choisie.',
      languageHelp: 'Ce choix s’applique à cette fenêtre. La barre d’outils conserve la langue du navigateur.',
      registrarHelp: 'Si le domaine semble libre, le bouton de vérification ouvre le site de ce prestataire.',
      availabilityHelp: 'Aucune donnée d’enregistrement trouvée. Vérifiez auprès du prestataire si le domaine est réellement disponible.'
    },
    views: [
      ['L’ESSENTIEL SUR UN NOM DE DOMAINE', 'Un domaine.<br><em>Les infos clés.</em>', 'Retrouvez son bureau d’enregistrement,<br>sa date de création et sa date d’expiration.', ['Prestataire et dates importantes', 'Serveurs DNS et statut du domaine'], 'Les informations utiles, directement dans Firefox.', 'Données fictives pour la démonstration'],
      ['PAS BESOIN D’OUVRIR LE SITE', 'Un autre domaine<br>à <em>vérifier ?</em>', 'Saisissez son nom ou collez une adresse web.<br>La recherche se lance depuis n’importe quel onglet.', ['Reconnaît le domaine de l’onglet actif', 'Un clic sur le crayon pour changer de domaine'], 'Recherchez le domaine qui vous intéresse.', 'Données fictives pour la démonstration'],
      ['LES BONS RÉGLAGES POUR VOUS', 'Vos réglages,<br><em>tout simplement.</em>', 'Choisissez la langue, le format des dates<br>et votre prestataire d’enregistrement préféré.', ['Disponible en 7 langues', 'Effacez le cache quand vous le souhaitez'], 'Tous vos réglages au même endroit.', 'Aperçu de l’interface en français'],
      ['CE NOM EST-IL ENCORE LIBRE ?', 'Le bon nom ?<br><em>Vérifiez-le.</em>', 'Aucune donnée d’enregistrement ? Consultez<br>le prestataire pour savoir si le domaine est libre.', ['10 prestataires au choix', 'Le prestataire confirme la disponibilité'], 'Votre idée prend forme : vérifiez le nom.', 'Exemple d’affichage, sans vérification en direct']
    ]
  },
  pt_BR: {
    name: 'Português (Brasil)', region: 'pt-BR', footer: 'Extensão para Firefox', lookup: 'Dados de domínio via WHOIS e RDAP', registrar: 'Registrador de exemplo',
    uiCopy: {
      domainLabel: 'Domínio ou endereço do site',
      settingsIntro: 'Ajuste o idioma, escolha seu registrador e gerencie os dados salvos.',
      dateFormatHelp: 'A opção automática usa o formato regional do navegador. As datas sempre seguem seu fuso horário, seja qual for o idioma da interface.',
      languageHelp: 'Esta opção muda o idioma desta janela. A barra de ferramentas continua no idioma do navegador.',
      registrarHelp: 'Se o domínio parecer disponível, o botão de consulta abrirá o site deste registrador.',
      availabilityHelp: 'Não encontramos dados de registro. Confira com o registrador se o domínio está mesmo disponível.',
      checkAt: 'Consultar na $1'
    },
    views: [
      ['CONHEÇA MELHOR O DOMÍNIO', 'Os dados que<br>você <em>procura.</em>', 'Veja onde o domínio foi registrado,<br>quando foi criado e quando vence.', ['Registrador e datas importantes', 'Servidores DNS e situação do domínio'], 'Consulte tudo direto no Firefox.', 'Demonstração com dados de exemplo'],
      ['CONSULTE SEM ABRIR O SITE', 'Quer consultar<br><em>outro domínio?</em>', 'É só digitar o domínio ou colar o endereço.<br>Você pode fazer isso de qualquer aba.', ['Identifica o domínio da aba aberta', 'Clique no lápis para consultar outro nome'], 'Outra consulta, sem sair da aba.', 'Demonstração com dados de exemplo'],
      ['DEIXE TUDO DO SEU JEITO', 'Ajustes simples.<br><em>Do seu jeito.</em>', 'Escolha o idioma, o formato das datas<br>e o registrador que você prefere usar.', ['Disponível em 7 idiomas', 'Limpe os dados salvos quando precisar'], 'Suas preferências ficam todas aqui.', 'Interface em português brasileiro'],
      ['SERÁ QUE ESSE NOME ESTÁ LIVRE?', 'Gostou do nome?<br><em>Confira agora.</em>', 'Se não houver dados de registro, consulte<br>o registrador para saber se o domínio está livre.', ['Escolha entre 10 registradores', 'Quem confirma a disponibilidade é o registrador'], 'O próximo passo para tirar a ideia do papel.', 'Exemplo de resultado, sem consulta em tempo real']
    ]
  },
  ja: {
    name: '日本語', region: 'ja-JP', footer: 'Firefox 拡張機能', lookup: 'WHOIS・RDAP でドメイン情報を確認', registrar: 'サンプルレジストラ',
    uiCopy: {
      domainLabel: 'ドメイン名またはURL',
      settingsIntro: '表示言語や登録先の設定、検索キャッシュの管理ができます。',
      dateFormatHelp: '「自動」ではブラウザーの地域設定に合わせて日付を表示します。どの形式でも端末のタイムゾーンが適用され、表示言語には左右されません。',
      languageHelp: 'この画面の表示言語を変更します。ツールバーの表示にはブラウザーの言語設定が使われます。',
      preferredRegistrar: '利用するレジストラ',
      registrarHelp: '未登録の可能性があるドメインの確認先として使用します。',
      possiblyAvailable: '取得できる可能性があります',
      availabilityHelp: '登録情報が見つかりませんでした。実際に取得できるかどうかは、レジストラのサイトでご確認ください。',
      checkAt: '$1で空き状況を確認'
    },
    views: [
      ['気になるドメインをすぐ確認', 'ドメイン情報を<br><em>ひと目で。</em>', 'どこで登録され、いつ作られたのか。<br>有効期限まで、まとめて確認できます。', ['レジストラ・登録日・有効期限を表示', 'ネームサーバーやドメインの状態も確認'], 'Firefoxのツールバーから手軽にチェック。', '画面内の登録情報はサンプルです'],
      ['サイトを開かずに調べられる', '別のドメインも<br><em>その場で検索。</em>', 'ドメイン名の入力やURLの貼り付けで検索。<br>調べたいサイトを開く必要はありません。', ['表示中のタブのドメインを自動で認識', '鉛筆アイコンから別のドメインを入力'], 'タブを切り替えずに、次の検索へ。', '画面内の登録情報はサンプルです'],
      ['使いやすい設定にカスタマイズ', '表示も設定も、<br><em>自分に合わせて。</em>', '表示言語や日付の形式を選んで、<br>よく使うレジストラも設定できます。', ['日本語を含む7言語に対応', '保存した検索キャッシュはいつでも削除'], '必要な設定は、この画面にまとめて。', '日本語での表示例'],
      ['このドメイン、まだ空いている？', '使いたい名前を<br><em>見つけたら。</em>', '登録情報が見つからないときは、<br>レジストラのサイトで空き状況を確認。', ['確認先は10のレジストラから選択', '実際の取得可否はレジストラで確認'], '気に入った名前が使えるか、確かめてみましょう。', '表示例です。実際の空き状況とは異なります']
    ]
  }
};
