(() => {
  'use strict'

  const $ = sel => document.querySelector(sel)
  const $all = sel => Array.from(document.querySelectorAll(sel))

  // Screens
  const authScreen = $('#auth-screen')
  const appScreen = $('#app')

  // Auth buttons
  const showLoginBtn = $('#show-login')
  const showSignupBtn = $('#show-signup')

  // Forms & inputs
  const loginEmail = $('#login-email')
  const loginPassword = $('#login-password')
  const signupName = $('#signup-name')
  const signupEmail = $('#signup-email')
  const signupPassword = $('#signup-password')

  // App elements
  const welcomeUser = $('#welcome-user')
  const logoutBtn = $('#logout')
  const postText = $('#post-text')
  const postImage = $('#post-image')
  const postBtn = $('#post-btn')
  const clearBtn = $('#clear-btn')
  const feed = $('#feed')
  const searchInput = $('#search')
  const toggleThemeBtn = $('#toggle-theme')
  const emojiBtns = $all('.emoji-btn')
  const filterChips = $all('.filter-chip')

  const editModal = $('#edit-modal')
  const editText = $('#edit-text')
  const saveEditBtn = $('#save-edit')
  const cancelEditBtn = $('#cancel-edit')

  // Navbar buttons
  const navHome = $('#nav-home')
  const navMyPosts = $('#nav-myposts')
  const navNotifications = $('#nav-notifications')
  const navProfile = $('#nav-profile')

  // LocalStorage keys
  const LS_USER_KEY = 'mini_social_user'
  const LS_POSTS_KEY = 'mini_social_posts'
  const LS_DARK_KEY = 'mini_social_dark'

  let currentUser = null
  let posts = []
  let activeFilter = 'all'
  let editingPostId = null

  // --- UTILS ---
  const loadUser = () => {
    const u = localStorage.getItem(LS_USER_KEY)
    currentUser = u ? JSON.parse(u) : null
  }
  const saveUser = () => {
    if(currentUser) localStorage.setItem(LS_USER_KEY, JSON.stringify(currentUser))
    else localStorage.removeItem(LS_USER_KEY)
  }
  const loadPosts = () => { const p = localStorage.getItem(LS_POSTS_KEY); posts = p ? JSON.parse(p) : [] }
  const savePosts = () => { localStorage.setItem(LS_POSTS_KEY, JSON.stringify(posts)) }
  const escapeHtml = s => s ? String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;') : ''

  function validateEmail(v){ return /\S+@\S+\.\S+/.test(v) }
  function showValidation(id,msg){ const el=document.getElementById(id);if(el){el.textContent=msg;el.classList.remove('d-none')} }
  function hideValidation(id){ const el=document.getElementById(id);if(el){el.textContent='';el.classList.add('d-none')} }

  function timeAgo(date){
    const seconds = Math.floor((new Date() - new Date(date)) / 1000)
    if(seconds < 60) return ${seconds} sec ago
    const minutes = Math.floor(seconds/60)
    if(minutes < 60) return ${minutes} min ago
    const hours = Math.floor(minutes/60)
    if(hours < 24) return ${hours} hour${hours>1?'s':''} ago
    const days = Math.floor(hours/24)
    return ${days} day${days>1?'s':''} ago
  }

  // --- AUTH SWITCH ---
  showLoginBtn?.addEventListener('click', ()=> {
    showLoginBtn.classList.add('active')
    showSignupBtn.classList.remove('active')
    $('#login-form').classList.remove('d-none')
    $('#signup-form').classList.add('d-none')
  })
  showSignupBtn?.addEventListener('click', ()=> {
    showSignupBtn.classList.add('active')
    showLoginBtn.classList.remove('active')
    $('#signup-form').classList.remove('d-none')
    $('#login-form').classList.add('d-none')
  })

  // --- SIGNUP ---
  $('#signup-form')?.addEventListener('submit', e => {
    e.preventDefault()
    const name = signupName.value.trim()
    const email = signupEmail.value.trim().toLowerCase()
    const pwd = signupPassword.value

    if(name.length < 3){ showValidation('signup-name-err','Name must be at least 3 characters'); return }
    if(!validateEmail(email)){ showValidation('signup-email-err','Enter a valid email'); return }
    if(pwd.length < 6){ showValidation('signup-pass-err','Password must be 6+ characters'); return }

    // Load existing users
    let users = JSON.parse(localStorage.getItem('mini_social_users') || '[]')

    // Check duplicate email
    if(users.some(u => u.email === email)){
      showValidation('signup-email-err','Email already registered')
      return
    }

    const newUser = { name, email, password: pwd }
    users.push(newUser)
    localStorage.setItem('mini_social_users', JSON.stringify(users))

    currentUser = newUser
    initApp()
  })

  // --- LOGIN ---
  $('#login-form')?.addEventListener('submit', e => {
    e.preventDefault()
    const email = loginEmail.value.trim().toLowerCase()
    const pwd = loginPassword.value

    let users = JSON.parse(localStorage.getItem('mini_social_users') || '[]')
    if(users.length === 0){ showValidation('login-error','No account found. Please signup.'); return }

    const user = users.find(u => u.email === email && u.password === pwd)
    if(user){
      currentUser = user
      hideValidation('login-error')
      initApp()
    } else {
      showValidation('login-error','Invalid credentials')
    }
  })

  // --- LOGOUT ---
  logoutBtn?.addEventListener('click', ()=> { currentUser=null; saveUser(); renderAuth() })

  // --- DARK MODE ---
  const setDark = (flag) => {
    document.body.classList.toggle('dark', !!flag)
    toggleThemeBtn.textContent = flag?'Light':'Dark'
    localStorage.setItem(LS_DARK_KEY, flag?'1':'0')
  }
  toggleThemeBtn?.addEventListener('click', ()=> setDark(!document.body.classList.contains('dark')) )

  // --- EMOJIS ---
  emojiBtns.forEach(btn => btn.addEventListener('click', ()=> { postText.value += btn.dataset.emoji; postText.focus() }))

  // --- POST CREATION ---
  postBtn?.addEventListener('click', ()=> {
    const text = postText.value.trim()
    const image = postImage.value.trim()
    if(!text && !image){ alert('Write something or add an image'); return }
    if(!currentUser){ alert('Login required'); return }

    const p = {
      id: Date.now().toString(),
      author: currentUser.name,
      authorEmail: currentUser.email,
      text,
      image: image || null,
      createdAt: new Date().toISOString(),
      likes: 0,
      likedBy: [],
      comments: []
    }

    posts.unshift(p)
    savePosts()
    postText.value = ''; postImage.value = ''
    renderPosts()
  })

  clearBtn?.addEventListener('click', ()=> { postText.value=''; postImage.value='' })

  // --- RENDER POSTS ---
  function renderPosts(){
    if(!feed) return
    const q = (searchInput?.value || '').trim().toLowerCase()
    let list = posts.slice()
    if(activeFilter==='mine') list = list.filter(p => p.authorEmail===currentUser.email)
    if(q) list = list.filter(p => (p.text||'').toLowerCase().includes(q) || p.author.toLowerCase().includes(q))

    feed.innerHTML = ''
    if(list.length === 0){ feed.innerHTML = '<div class="text-center text-muted py-4">No posts to show.</div>'; return }

    list.forEach(post => {
      const el = document.createElement('div')
      el.className = 'post-card'
      const initial = (post.author||'U').trim().charAt(0).toUpperCase()

      el.innerHTML = `
        <div class="d-flex justify-content-between align-items-start">
          <div class="post-author">
            <div class="avatar">${initial}</div>
            <div>
              <div><strong style="color:#0f1724">${escapeHtml(post.author)}</strong></div>
              <div class="post-meta">${timeAgo(post.createdAt)}</div>
            </div>
          </div>
          <div class="post-btns">
            ${post.authorEmail===currentUser.email?'<button class="edit-btn">Edit</button>':''}
            ${post.authorEmail===currentUser.email?'<button class="delete-btn">Delete</button>':''}
          </div>
        </div>
        <div class="post-text mt-2">${escapeHtml(post.text)}</div>
        ${post.image?<img src="${post.image}" alt="Post Image" class="img-fluid rounded mt-2">:''}
        <div class="post-actions">
          <button class="like-btn ${post.likedBy.includes(currentUser.email)?'liked':''}">❤ <span class="like-count">${post.likes}</span></button>
          <button class="comment-btn btn btn-sm btn-light">💬 Comment</button>
        </div>
        <div class="comments mt-2">
          ${post.comments.map(c => `
            <div class="comment" data-comment-id="${c.id}">
              <div><strong>${escapeHtml(c.author)}:</strong> ${escapeHtml(c.text)}</div>
              <div>
                ${c.authorEmail===currentUser.email?'<button class="edit-comment btn btn-sm btn-outline-secondary">Edit</button><button class="delete-comment btn btn-sm btn-outline-danger">Delete</button>':''}
              </div>
            </div>`).join('')}
          <div class="add-comment d-none">
            <input type="text" class="form-control form-control-sm comment-input mb-1" placeholder="Write a comment">
            <button class="btn btn-primary btn-sm submit-comment">Post</button>
          </div>
        </div>
      `

      const likeBtn = el.querySelector('.like-btn')
      likeBtn.addEventListener('click', ()=> toggleLike(post.id))

      const delBtn = el.querySelector('.delete-btn')
      if(delBtn) delBtn.addEventListener('click', ()=> { if(confirm('Delete this post?')) deletePost(post.id) })

      const editBtn = el.querySelector('.edit-btn')
      if(editBtn) editBtn.addEventListener('click', ()=> openEdit(post.id))

      el.querySelector('.comment-btn')?.addEventListener('click', ()=> {
        const box = el.querySelector('.add-comment')
        box.classList.toggle('d-none')
        const input = box.querySelector('.comment-input')
        if(!box.classList.contains('d-none')) input.focus()
      })

      const submitCommentBtn = el.querySelector('.submit-comment')
      if(submitCommentBtn){
        submitCommentBtn.addEventListener('click', ()=> {
          const input = el.querySelector('.comment-input')
          const val = input.value.trim()
          if(!val) return
          const c = { id: Date.now().toString(), author: currentUser.name, authorEmail: currentUser.email, text: val }
          post.comments.push(c)
          savePosts()
          renderPosts()
        })
      }

      el.querySelectorAll('.edit-comment').forEach(btn=>{
        btn.addEventListener('click', ()=>{
          const commentEl = btn.closest('.comment')
          const id = commentEl.dataset.commentId
          const c = post.comments.find(c=>c.id===id)
          if(!c) return
          const newText = prompt('Edit comment', c.text)
          if(newText!==null){ c.text = newText.trim(); savePosts(); renderPosts() }
        })
      })

      el.querySelectorAll('.delete-comment').forEach(btn=>{
        btn.addEventListener('click', ()=>{
          const commentEl = btn.closest('.comment')
          const id = commentEl.dataset.commentId
          post.comments = post.comments.filter(c=>c.id!==id)
          savePosts(); renderPosts()
        })
      })

      feed.appendChild(el)
    })
  }

  function toggleLike(id){
    const p = posts.find(x=>x.id===id)
    if(!p) return
    if(p.likedBy.includes(currentUser.email)){
      p.likedBy = p.likedBy.filter(e=>e!==currentUser.email)
      p.likes = Math.max(0,p.likes-1)
    } else { p.likedBy.push(currentUser.email); p.likes+=1 }
    savePosts(); renderPosts()
  }
  function deletePost(id){ posts = posts.filter(p=>p.id!==id); savePosts(); renderPosts() }
  function openEdit(id){
    const p = posts.find(x=>x.id===id)
    if(!p) return
    editingPostId = id
    editText.value = p.text
    editModal.classList.remove('d-none')
    setTimeout(()=> editText.focus(), 60)
  }
  saveEditBtn?.addEventListener('click', ()=>{
    const p = posts.find(x=>x.id===editingPostId)
    if(!p) return
    p.text = editText.value.trim()
    savePosts(); renderPosts(); editModal.classList.add('d-none')
  })
  cancelEditBtn?.addEventListener('click', ()=> editModal.classList.add('d-none'))
  document.addEventListener('keydown', (e) => { if(e.key === 'Escape') editModal.classList.add('d-none') })

  searchInput?.addEventListener('input', ()=> renderPosts())
  filterChips.forEach(chip=>chip.addEventListener('click', ()=>{
    filterChips.forEach(c=>c.classList.remove('active'))
    chip.classList.add('active')
    activeFilter = chip.dataset.filter
    renderPosts()
  }))

  navHome?.addEventListener('click', ()=> {
    activeFilter = 'all'
    filterChips.forEach(c=>c.classList.remove('active'))
    if(filterChips[0]) filterChips[0].classList.add('active')
    searchInput.value = ''
    renderPosts()
  })
  navMyPosts?.addEventListener('click', ()=> {
    activeFilter = 'mine'
    filterChips.forEach(c=>c.classList.remove('active'))
    if(filterChips[1]) filterChips[1].classList.add('active')
    searchInput.value = ''
    renderPosts()
  })
  navNotifications?.addEventListener('click', ()=> alert('No notifications yet!'))
  navProfile?.addEventListener('click', ()=> {
    if(!currentUser) return
    alert(Profile\nName: ${currentUser.name}\nEmail: ${currentUser.email})
  })

  function renderAuth(){
    loadUser(); loadPosts(); setDark(localStorage.getItem(LS_DARK_KEY)==='1')
    if(currentUser){
      authScreen.classList.add('d-none'); appScreen.classList.remove('d-none')
      welcomeUser.textContent = Welcome, ${currentUser.name}
      welcomeUser.classList.add('user-badge')
      renderPosts()
    } else { authScreen.classList.remove('d-none'); appScreen.classList.add('d-none') }
  }
  function initApp(){ saveUser(); renderAuth() }

  document.addEventListener('DOMContentLoaded', renderAuth)
})();