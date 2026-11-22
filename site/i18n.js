// Triple C — interface language (RU / EN). Track titles are never translated.
(() => {
  'use strict';
  const DICT = {
    ru: {
      'doc.title': 'Triple C — музыка с ритмом и мантрами',
      'doc.desc': 'Triple C — живые барабаны, мантры, этно-ритмы, лофи и покой.',
      'credits.doc.title': 'Авторы и лицензии — Triple C',
      beta: 'бета', 'lang.label': 'Язык интерфейса', 'lang.switch': 'Switch to English',
      'view.label': 'Вид каталога', 'view.grid': 'Сеткой', 'view.list': 'Списком',
      'greet.night': 'Доброй ночи', 'greet.morning': 'Доброе утро', 'greet.day': 'Добрый день', 'greet.evening': 'Добрый вечер',
      'hero.q': 'Что тебе сейчас нужно?', 'moods.label': 'Настроение',
      'mood.all': 'Все', 'mood.energy': 'Энергия', 'mood.rhythm': 'Ритм', 'mood.mantra': 'Мантры',
      'mood.drums': 'Барабаны', 'mood.lofi': 'Лофи', 'mood.calm': 'Покой', 'title.all': 'Все треки',
      'play.all': 'Слушать', 'orig.title': 'Оригиналы Triple C', 'orig.text': 'Здесь появятся наши собственные треки. Скоро.',
      'orig.badge': 'Оригинал', 'orig.full': 'Оригинал Triple C', 'orig.tip': 'Трек Triple C',
      'foot.only': 'Музыка доступна только для прослушивания в Triple C.',
      'foot.rights': 'Треки каталога принадлежат их авторам и используются по открытым лицензиям (CC0, CC BY 3.0 и CC BY 4.0). Часть треков воспроизводится напрямую с сайтов-источников. Обложки — оригинальные иллюстрации Triple C.',
      'foot.credits': 'Авторы и лицензии',
      'mini.open': 'Открыть плеер', prev: 'Предыдущий', next: 'Следующий', play: 'Играть', pause: 'Пауза',
      player: 'Плеер', collapse: 'Свернуть', 'now.playing': 'Сейчас звучит', seek: 'Перемотка',
      shuffle: 'Перемешать', repeat: 'Повтор', 'repeat.one': 'Повтор одного', 'repeat.all': 'Повтор всех',
      mute: 'Звук', volume: 'Громкость', 'lic.tip': 'Лицензия: {l}. Автор: {a}',
      'cr.back': 'Назад к плееру', 'cr.h1': 'Авторы и лицензии',
      'cr.lead': 'Музыка доступна только для прослушивания в Triple C. Треки каталога созданы указанными ниже авторами и используются по открытым лицензиям, разрешающим в том числе коммерческое использование. Права на эти треки принадлежат их авторам: Triple C их не присваивает. Обложки — оригинальные иллюстрации Triple C. Собственные треки Triple C будут отмечены как «Оригинал Triple C».',
      'cr.license': 'Лицензия', 'cr.album': 'Альбом', 'cr.source': 'Источник', 'cr.artist': 'страница автора',
      'cr.changes': 'Перекодировано в MP3 128 kbps, метаданные удалены. Обложка — оригинальная иллюстрация Triple C.',
      'cr.archive': 'архив Internet Archive',
      'hear.btn': 'Слышу', 'hear.title': 'Слышу', 'hear.close': 'Закрыть', 'hear.start': 'Слушать',
      'hear.idle': 'Нажми и поднеси телефон к музыке', 'hear.idle2': 'Узнаю трек из каталога Triple C, а если ты напоёшь песню со словами — попробую найти её по тексту.',
      'hear.listening': 'Слушаю… {s} с', 'hear.listening2': 'Нажми ещё раз, чтобы закончить раньше', 'hear.analyzing': 'Разбираю запись…',
      'hear.again': 'Послушать ещё раз', 'hear.denied': 'Нет доступа к микрофону. Разреши его в настройках браузера и попробуй снова.',
      'hear.nomic': 'Этот браузер не умеет записывать звук. Попробуй Chrome, Safari или Firefox.', 'hear.quiet': 'Почти ничего не слышно. Поднеси телефон ближе к звуку.',
      'step.catalog': 'Ищу в каталоге Triple C', 'step.acoustid': 'AcoustID и MusicBrainz', 'step.words': 'Разбираю слова (Whisper в браузере)', 'step.lyrics': 'Ищу песню по словам',
      'step.model': 'Загружаю модель распознавания речи… {p}%', 'step.nokey': 'нужен бесплатный ключ AcoustID, пока выключено', 'step.skip': 'не нужно', 'step.none': 'не нашла', 'step.found': 'нашла', 'step.err': 'сервис не ответил',
      'res.catalog': 'Это трек из Triple C', 'res.match': 'совпадение {p}%', 'res.play': 'Слушать', 'res.similar': 'Похожее у нас', 'res.similarTitle': 'Похожее у нас по ритму и настроению',
      'res.heard': 'Я услышала слова: «{t}»', 'res.song': 'Похоже, это песня', 'res.verified': 'текст совпадает', 'res.maybe': 'не уверена, проверь',
      'res.listen': 'Где послушать', 'res.acoustid': 'Узнала по отпечатку AcoustID',
      'res.none': 'Не узнала. Такого трека нет в нашем каталоге, а слов разобрать не получилось.', 'res.noneWords': 'По этим словам песню найти не получилось.',
      'res.tip': 'Можно включить «Похожее у нас» — подберу треки с похожим ритмом и настроением.', 'res.bpm': '{b} уд/мин',
      'hear.privacy': 'Запись не сохраняется и не отправляется: каталог и отпечатки проверяются прямо в браузере. Только для поиска песни по словам распознанный текст уходит в бесплатный сервис.',
      'search.ph': 'Поиск: трек или автор', 'search.label': 'Поиск', 'search.clear': 'Очистить',
      'genre.label': 'Жанр', 'genre.all': 'Все жанры', 'genre.ethno': 'Этно', 'genre.drums': 'Барабаны', 'genre.mantra': 'Мантры',
      'genre.electronic': 'Электроника', 'genre.downtempo': 'Даунтемпо', 'genre.lofi': 'Лофи', 'genre.ambient': 'Эмбиент',
      'genre.cinematic': 'Кино', 'genre.neoclassical': 'Неоклассика', 'genre.acoustic': 'Акустика',
      'empty': 'Ничего не нашлось. Попробуй другой запрос или жанр.', 'more': 'Показать ещё',
      'cr.changes.remote': 'Воспроизводится напрямую с сайта-источника, без изменений. Обложка — оригинальная иллюстрация Triple C.',
    },
    en: {
      'doc.title': 'Triple C — rhythm, mantras and calm',
      'doc.desc': 'Triple C — live drums, mantras, ethnic rhythms, lo-fi and calm.',
      'credits.doc.title': 'Credits & licenses — Triple C',
      beta: 'beta', 'lang.label': 'Interface language', 'lang.switch': 'Переключить на русский',
      'view.label': 'Catalog view', 'view.grid': 'Grid', 'view.list': 'List',
      'greet.night': 'Good night', 'greet.morning': 'Good morning', 'greet.day': 'Good afternoon', 'greet.evening': 'Good evening',
      'hero.q': 'What do you need right now?', 'moods.label': 'Mood',
      'mood.all': 'All', 'mood.energy': 'Energy', 'mood.rhythm': 'Rhythm', 'mood.mantra': 'Mantras',
      'mood.drums': 'Drums', 'mood.lofi': 'Lo-fi', 'mood.calm': 'Calm', 'title.all': 'All tracks',
      'play.all': 'Play', 'orig.title': 'Triple C Originals', 'orig.text': 'Our own tracks will appear here. Soon.',
      'orig.badge': 'Original', 'orig.full': 'Triple C Original', 'orig.tip': 'Triple C track',
      'foot.only': 'Music is available for listening in Triple C only.',
      'foot.rights': 'Catalog tracks belong to their authors and are used under open licenses (CC0, CC BY 3.0 and CC BY 4.0). Some tracks stream directly from their source sites. Cover art is original Triple C artwork.',
      'foot.credits': 'Credits & licenses',
      'mini.open': 'Open player', prev: 'Previous', next: 'Next', play: 'Play', pause: 'Pause',
      player: 'Player', collapse: 'Collapse', 'now.playing': 'Now playing', seek: 'Seek',
      shuffle: 'Shuffle', repeat: 'Repeat', 'repeat.one': 'Repeat one', 'repeat.all': 'Repeat all',
      mute: 'Sound', volume: 'Volume', 'lic.tip': 'License: {l}. Author: {a}',
      'cr.back': 'Back to player', 'cr.h1': 'Credits & licenses',
      'cr.lead': 'Music is available for listening in Triple C only. Catalog tracks were created by the authors listed below and are used under open licenses that also allow commercial use. All rights to these tracks belong to their authors; Triple C claims no ownership. Cover art is original Triple C artwork. Triple C’s own tracks will be marked “Triple C Original”.',
      'cr.license': 'License', 'cr.album': 'Album', 'cr.source': 'Source', 'cr.artist': 'artist page',
      'cr.changes': 'Transcoded to MP3 128 kbps, metadata removed. Cover is original Triple C artwork.',
      'cr.archive': 'Internet Archive',
      'hear.btn': 'Hear', 'hear.title': 'Hear', 'hear.close': 'Close', 'hear.start': 'Listen',
      'hear.idle': 'Tap and hold your phone near the music', 'hear.idle2': 'I’ll recognise tracks from the Triple C catalog, and if you sing a song with words I’ll try to find it by its lyrics.',
      'hear.listening': 'Listening… {s} s', 'hear.listening2': 'Tap again to finish early', 'hear.analyzing': 'Analysing the recording…',
      'hear.again': 'Listen again', 'hear.denied': 'No microphone access. Allow it in your browser settings and try again.',
      'hear.nomic': 'This browser can’t record audio. Try Chrome, Safari or Firefox.', 'hear.quiet': 'I can barely hear anything. Move closer to the sound.',
      'step.catalog': 'Searching the Triple C catalog', 'step.acoustid': 'AcoustID & MusicBrainz', 'step.words': 'Transcribing words (Whisper in your browser)', 'step.lyrics': 'Looking up the song by its lyrics',
      'step.model': 'Loading the speech model… {p}%', 'step.nokey': 'needs a free AcoustID key, off for now', 'step.skip': 'not needed', 'step.none': 'not found', 'step.found': 'found', 'step.err': 'service did not respond',
      'res.catalog': 'This is a Triple C track', 'res.match': '{p}% match', 'res.play': 'Play', 'res.similar': 'Similar here', 'res.similarTitle': 'Similar in Triple C by rhythm and mood',
      'res.heard': 'I heard the words: “{t}”', 'res.song': 'Looks like this song', 'res.verified': 'lyrics match', 'res.maybe': 'not sure, please check',
      'res.listen': 'Listen on', 'res.acoustid': 'Recognised by AcoustID fingerprint',
      'res.none': 'Couldn’t recognise it. This track isn’t in our catalog and I couldn’t make out any words.', 'res.noneWords': 'Couldn’t find a song with these words.',
      'res.tip': 'Try “Similar here” — I’ll pick tracks with a similar rhythm and mood.', 'res.bpm': '{b} BPM',
      'hear.privacy': 'The recording is never stored or uploaded: catalog matching runs right in your browser. Only for lyric search is the transcribed text sent to a free service.',
      'search.ph': 'Search tracks or artists', 'search.label': 'Search', 'search.clear': 'Clear',
      'genre.label': 'Genre', 'genre.all': 'All genres', 'genre.ethno': 'Ethno', 'genre.drums': 'Drums', 'genre.mantra': 'Mantras',
      'genre.electronic': 'Electronic', 'genre.downtempo': 'Downtempo', 'genre.lofi': 'Lo-fi', 'genre.ambient': 'Ambient',
      'genre.cinematic': 'Cinematic', 'genre.neoclassical': 'Neoclassical', 'genre.acoustic': 'Acoustic',
      'empty': 'Nothing found. Try another search or genre.', 'more': 'Show more',
      'cr.changes.remote': 'Streamed directly from the source site, unmodified. Cover is original Triple C artwork.',
    },
  };
  const KEY = 'tc.lang';
  const detect = () => {
    try { const s = localStorage.getItem(KEY); if (s === 'ru' || s === 'en') return s; } catch {}
    const langs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ''];
    return String(langs[0] || '').toLowerCase().startsWith('ru') ? 'ru' : 'en';
  };
  let lang = detect();
  const listeners = [];
  const t = (k, vars) => {
    let s = (DICT[lang] && DICT[lang][k]) ?? DICT.ru[k] ?? k;
    if (vars) for (const [n, v] of Object.entries(vars)) s = s.replace(`{${n}}`, v);
    return s;
  };
  function apply(root = document) {
    document.documentElement.lang = lang;
    root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    root.querySelectorAll('[data-i18n-aria]').forEach((el) => el.setAttribute('aria-label', t(el.dataset.i18nAria)));
    root.querySelectorAll('[data-i18n-ph]').forEach((el) => el.setAttribute('placeholder', t(el.dataset.i18nPh)));
    root.querySelectorAll('[data-i18n-title]').forEach((el) => el.setAttribute('title', t(el.dataset.i18nTitle)));
    const dt = document.body && document.body.dataset.titleKey;
    if (dt) document.title = t(dt);
    const md = document.querySelector('meta[name="description"]'); if (md) md.content = t('doc.desc');
    const mf = document.querySelector('link[rel="manifest"]');
    if (mf) mf.href = lang === 'en' ? 'manifest.en.webmanifest' : 'manifest.webmanifest';
    document.querySelectorAll('.lang-switch [data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
  }
  function set(l) {
    if (l !== 'ru' && l !== 'en') return;
    lang = l; try { localStorage.setItem(KEY, l); } catch {}
    apply(); listeners.forEach((f) => { try { f(lang); } catch (e) { console.error(e); } });
  }
  function bindSwitch() {
    document.querySelectorAll('.lang-switch').forEach((g) => g.addEventListener('click', (e) => {
      const b = e.target.closest('[data-lang]'); if (b) set(b.dataset.lang);
    }));
  }
  window.TC = { t, set, get lang() { return lang; }, onChange: (f) => listeners.push(f), apply };
  document.documentElement.lang = lang;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { apply(); bindSwitch(); });
  else { apply(); bindSwitch(); }
})();
