addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request))
})

const BOT_TOKEN = "8462332794:AAEiPSicYCqwTxIF7HZXiebLG7myTbyn6xI" // keep private
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`

// In-memory cart per user
const userCarts = {}
// Tracks users who are entering their order info
const pendingOrders = {}

// Define concepts with updated sizes & prices
const concepts = {
  "Whispers&Pages": [
    { size: "Mini (6–7 предметів)", price: 419 },
    { size: "Standard (8–10 предметів)", price: 625 }
  ],
  "Wednesday_Reads": [
    { size: "Mini (6–7 предметів)", price: 489 },
    { size: "Standard (8–10 предметів)", price: 675 }
  ]
}

const adminChatId = "3355615176" // numeric chat ID of admin

// 50 cozy/mystical predictions
const predictions = [
  "Ти отримаєш приємну новину сьогодні 🌤️",
  "Хтось згадає тебе з теплом 💌",
  "Твоє серце сьогодні буде спокійним ☁️",
  "Несподівана дрібниця зробить твій день 🌸",
  "Чай смакуватиме краще, ніж зазвичай 🍵",
  "Ти зустрінеш людину, яка тебе надихне ✨",
  "Все складеться краще, ніж ти очікуєш 🌈",
  "Хтось подарує тобі усмішку сьогодні 😊",
  "Твоя музика сьогодні говоритиме з душею 🎧",
  "Тебе чекає маленьке диво 🕊️",
  "Дощ стане твоїм натхненням 🌧️",
  "Сонце сяятиме саме для тебе ☀️",
  "Хтось думає про тебе просто зараз 💭",
  "Довірся інтуїції — вона не помиляється 🌙",
  "Сьогодні день, щоб пробачити себе 💗",
  "Найкраще рішення прийдеш спонтанно ⚡",
  "Хтось поділиться з тобою добротою 🤍",
  "Сьогодні — ідеальний день для спокою 🕯️",
  "Ти знайдеш те, що давно шукав 🔍",
  "Після тиші прийде щось хороше 🌿",
  "Ти зрозумієш важливу дрібницю 💫",
  "Ніч сьогодні буде лагідною 🌜",
  "Хтось скаже тобі слова, яких бракувало 🫶",
  "Довгоочікувана відповідь знайде тебе 📬",
  "Коли здається, що пізно — саме час ⏳",
  "Ти станеш для когось натхненням 💡",
  "Випадковість сьогодні не випадкова 🎲",
  "Хтось хоче обійняти тебе прямо зараз 🤗",
  "Твоє серце стане трохи легшим 💞",
  "День принесе тепло, навіть без сонця ☁️",
  "Сьогодні добре просто бути 🌻",
  "Щось нове почнеться тихо 🌅",
  "Ти відчуєш підтримку звідти, звідки не чекав 🤍",
  "Ти побачиш знак, якщо уважно глянеш 👀",
  "Друзі сьогодні ближчі, ніж здається 👥",
  "Хтось цінує тебе більше, ніж ти думаєш 🌸",
  "Мрія, яку ти забув, скоро нагадає про себе ✨",
  "Сьогодні в повітрі є спокій 🌬️",
  "Все, що потрібно, уже поруч 💫",
  "Невелике диво чекає в простих речах 🪶",
  "Хтось приготував для тебе приємну несподіванку 🎁",
  "Ти відчуєш гармонію навіть у дрібницях 🌾",
  "Світ сьогодні трохи лагідніший до тебе 🌍",
  "Ти отримаєш потрібну пораду 🪞",
  "Сьогодні — гарний день для мрій 🌤️",
  "Хтось пошле тобі добру енергію 🌟",
  "Ти зробиш правильний вибір 💭",
  "Щастя прийде звідти, звідки не чекав 🌈",
  "Всесвіт сьогодні на твоєму боці 🌌",
  "Твоє серце підкаже правильний шлях 💫"
]

// --- Main handler ---
async function handleRequest(request) {
  if (request.method !== "POST") return new Response("ok")
  const update = await request.json().catch(() => null)
  if (!update) return new Response("no update", { status: 200 })

  // Handle messages
  if (update.message) {
    const chat_id = update.message.chat.id
    const text = update.message.text

    // If user is entering order info
    if (pendingOrders[chat_id]) {
      const items = userCarts[chat_id] || []
      let total = 0
      const itemLines = items.map(item => {
        const [conceptName, sizeName] = item.split(" — ")
        const priceObj = concepts[conceptName].find(s => s.size === sizeName)
        if (priceObj) total += priceObj.price
        return `- ${item} — ${priceObj ? priceObj.price : "?"} грн`
      })

      const orderText = `📦 Нове замовлення від ${update.message.from.first_name || ""} ${update.message.from.last_name || ""} (@${update.message.from.username || "—"}):\n\n${itemLines.join("\n")}\n\n💰 Разом: ${total} грн\n\n📝 Дані для доставки:\n${text}`

      await sendMessage(adminChatId, orderText)
      await sendMessage(chat_id, `Дякуємо! ✅ Цю інформацію відправлено адміну. Натисніть, щоб звязатися з адміном та зробити замовлення!: https://t.me/justmissalice`)

      userCarts[chat_id] = []
      delete pendingOrders[chat_id]
      return new Response("ok")
    }

    if (text === "/start") {
      await sendMainMenu(chat_id)
    } else if (text === "/cart") {
      await sendCart(chat_id)
    }
  }

  // Handle button presses
  if (update.callback_query) {
    const cb = update.callback_query
    const chat_id = cb.message.chat.id
    const message_id = cb.message.message_id
    const data = cb.data

    switch (data) {
      case "main_menu":
        await sendMainMenu(chat_id, message_id)
        break
      case "concept":
        await sendConceptMenu(chat_id, message_id)
        break
      case "price":
        await sendMessage(chat_id, "💰 Ціни залежать від концепції та розміру. Оберіть концепцію щоб побачити ціни.")
        break
      case "order":
        await sendMessage(chat_id, "Щоб зробити замовлення, виберіть концепцію та розмір, перейдіть до кошика та натисніть - 💳 Оформити замовлення !")
        break
      case "about":
        await sendMessage(chat_id, "📖 BookNest — твій простір спокою серед буднів. Вибирай концепції, формати та отримуй свій персональний бокс!")
        break
      case "cart":
        await sendCart(chat_id)
        break
      case "prediction":
        const random = predictions[Math.floor(Math.random() * predictions.length)]
        await answerCallback(cb.id)
        await sendMessage(chat_id, `🔮 ${random}`)
        break
      case "buy":
        await answerCallback(cb.id)
        if ((userCarts[chat_id] || []).length === 0) {
          await sendMessage(chat_id, "Ваш кошик порожній! 😅")
        } else {
          pendingOrders[chat_id] = true
          await sendMessage(chat_id, `Чудовий вибір🕯️Напишіть таку інформацію для підтвердження замовлення :

          - Ваше місто 🌇
          - Найближчий поштомат, відділення Нової пошти або Укр пошти 🏤
          - Ім’я та прізвище 📄
          - Номер телефону ☎️
          
          Та ми автоматично передамо ваше замовлення адміну 😇.`)
        }
        break
      default:
        if (data.startsWith("conceptChoice_")) {
          const conceptKey = data.replace("conceptChoice_", "")
          await sendSizesMenu(chat_id, message_id, conceptKey)
        } 
        // ✅ UPDATED sizeChoice_ HANDLER WITH DELAY
        else if (data.startsWith("sizeChoice_")) {
          const [conceptKey, sizeIndex] = data.replace("sizeChoice_", "").split("_")
          const sizeObj = concepts[conceptKey][parseInt(sizeIndex)]
          const itemName = `${conceptKey} — ${sizeObj.size}`
          if (!userCarts[chat_id]) userCarts[chat_id] = []
          userCarts[chat_id].push(itemName)

          await answerCallback(cb.id)

          // Confirm add to cart
          await editMessage(chat_id, message_id, `✅ Додано до кошика: ${itemName}`)
          
          // Small delay to ensure Telegram processes edit
          await new Promise(r => setTimeout(r, 600))
          
          // Now safely send main menu
          await sendMainMenu(chat_id)
        } 
        else if (data.startsWith("removeItem_")) {
          const idx = parseInt(data.replace("removeItem_", ""))
          if (userCarts[chat_id]) {
            userCarts[chat_id].splice(idx, 1)
          }
          await answerCallback(cb.id)
          await sendCart(chat_id)
        } else {
          await answerCallback(cb.id)
          await sendMessage(chat_id, "Ця функція з'явиться трохи пізніше ✨")
        }
        break
    }
  }

  return new Response("ok", { status: 200 })
}

// --- Helpers ---
async function sendMessage(chat_id, text, keyboard = null) {
  const payload = { chat_id, text }
  if (keyboard) payload.reply_markup = keyboard
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  })
}

async function editMessage(chat_id, message_id, text, keyboard = null) {
  const payload = { chat_id, message_id, text }
  if (keyboard) payload.reply_markup = keyboard
  await fetch(`${TELEGRAM_API}/editMessageText`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  })
}

async function answerCallback(callback_query_id) {
  await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ callback_query_id })
  })
}

// --- Menus ---
async function sendMainMenu(chat_id, message_id = null) {
  const text = `Привіт! Я BookNest-бот — допоможу створити твій простір спокою серед буднів 🕯

Обери, з чого почнемо ↓`
  const keyboard = {
    inline_keyboard: [
      [{ text: "☁️ Обрати концепцію", callback_data: "concept" }],
      [
        { text: "💰 Дізнатись ціну", callback_data: "price" },
        { text: "💌 Зробити замовлення", callback_data: "order" }
      ],
      [
        { text: "📚 Передбачення", callback_data: "prediction" },
        { text: "🛒 Кошик", callback_data: "cart" }
      ],
      [{ text: "📖 Про BookNest", callback_data: "about" }]
    ]
  }

  if (message_id) {
    await editMessage(chat_id, message_id, text, keyboard)
  } else {
    await sendMessage(chat_id, text, keyboard)
  }
}

async function sendConceptMenu(chat_id, message_id = null) {
  const text = `Оберіть концепцію:`
  const keyboard = {
    inline_keyboard: Object.keys(concepts).map(c => [{ text: c, callback_data: `conceptChoice_${c}` }])
      .concat([[{ text: "⬅️ Повернутись у меню", callback_data: "main_menu" }]])
  }

  if (message_id) {
    await editMessage(chat_id, message_id, text, keyboard)
  } else {
    await sendMessage(chat_id, text, keyboard)
  }
}

async function sendSizesMenu(chat_id, message_id, conceptKey) {
  const sizes = concepts[conceptKey]
  const text = `Оберіть розмір для ${conceptKey}:`
  const keyboard = {
    inline_keyboard: sizes.map((s, idx) => [
      { text: `${s.size} — 💰 ${s.price} грн`, callback_data: `sizeChoice_${conceptKey}_${idx}` }
    ])
  }

  await editMessage(chat_id, message_id, text, keyboard)
}

// --- Cart function ---
async function sendCart(chat_id) {
  const items = userCarts[chat_id] || []
  if (!items.length) {
    await sendMessage(chat_id, "🛒 Ваш кошик порожній")
    return
  }

  let total = 0
  const itemLines = items.map((item, idx) => {
    const [conceptName, sizeName] = item.split(" — ")
    const priceObj = concepts[conceptName].find(s => s.size === sizeName)
    if (priceObj) total += priceObj.price
    return `${item} — ${priceObj ? priceObj.price : "?"} грн`
  })

  const text = `🛒 Ваш кошик:\n${itemLines.map(i => `- ${i}`).join("\n")}\n\n💰 Разом: ${total} грн`

  const keyboard = {
    inline_keyboard: [
      ...items.map((item, idx) => {
        const [conceptName, sizeName] = item.split(" — ")
        const priceObj = concepts[conceptName].find(s => s.size === sizeName)
        return [{ text: `❌ Видалити ${item} — ${priceObj.price}₴`, callback_data: `removeItem_${idx}` }]
      }),
      [{ text: "💳 Оформити замовлення", callback_data: "buy" }],
      [{ text: "⬅️ Повернутись у меню", callback_data: "main_menu" }]
    ]
  }

  await sendMessage(chat_id, text, keyboard)
}
