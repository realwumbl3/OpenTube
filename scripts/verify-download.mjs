import http from 'http'

const vid = process.argv[2] || 'd28831cd-ccea-498d-ad00-733565269e40'
const token = process.argv[3] || 'f1d70f3c6514d4b11118fe635383fcec872c79964e98031e'

function request(path, { method = 'GET', headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: '127.0.0.1', port: 3001, path, method, headers },
      (res) => {
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () =>
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks),
          })
        )
      }
    )
    req.on('error', reject)
    req.end()
  })
}

const noAuth = await request(`/api/videos/${vid}/download`)
if (noAuth.status !== 401) {
  console.error('expected 401 without session, got', noAuth.status)
  process.exit(1)
}

const login = await request(`/api/auth/magic/${token}`, { method: 'POST' })
const cookie = (login.headers['set-cookie'] || [])[0]?.split(';')[0]
if (!cookie) {
  console.error('no session cookie from magic login')
  process.exit(1)
}

const dl = await request(`/api/videos/${vid}/download`, { headers: { Cookie: cookie } })
if (dl.status !== 200) {
  console.error('expected 200 with session, got', dl.status, dl.body.toString())
  process.exit(1)
}
const cd = dl.headers['content-disposition'] || ''
if (!/attachment/i.test(cd)) {
  console.error('missing attachment disposition:', cd)
  process.exit(1)
}
if (dl.body.length < 1000) {
  console.error('download body too small', dl.body.length)
  process.exit(1)
}
console.log('ok', { bytes: dl.body.length, disposition: cd })
