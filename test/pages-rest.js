const t = require('../test-lib/test.js');
const assert = require('assert');
const _ = require('lodash');

let apos;
let homeId;
let jar;

describe('Pages', function() {

  this.timeout(t.timeout);

  after(function() {
    return t.destroy(apos);
  });

  // EXISTENCE

  it('should be a property of the apos object', async function() {
    apos = await require('../index.js')({
      root: module,
      shortName: 'test',
      argv: {
        _: []
      },
      modules: {
        'apostrophe-express': {
          options: {
            session: {
              secret: 'Adipiscing'
            },
            port: 7900
          }
        },
        'apostrophe-pages': {
          options: {
            park: [],
            types: [
              {
                name: 'home',
                label: 'Home'
              },
              {
                name: 'testPage',
                label: 'Test Page'
              }
            ]
          }
        }
      }
    });

    assert(apos.pages.__meta.name === 'apostrophe-pages');
  });

  it('should be able to insert test user', async function() {
    assert(apos.users.newInstance);
    const user = apos.users.newInstance();
    assert(user);

    user.firstName = 'ad';
    user.lastName = 'min';
    user.title = 'admin';
    user.username = 'admin';
    user.password = 'admin';
    user.email = 'ad@min.com';
    user.permissions = [ 'admin' ];

    return apos.users.insert(apos.tasks.getReq(), user);
  });

  it('REST: should be able to log in as admin', async () => {
    jar = apos.http.jar();

    // establish session
    let page = await apos.http.get('http://localhost:7900/', {
      jar
    });

    assert(page.match(/logged out/));

    // Log in

    await apos.http.post('http://localhost:7900/api/v1/apostrophe-login/login', {
      body: {
        username: 'admin',
        password: 'admin'
      },
      jar
    });

    // Confirm login
    page = await apos.http.get('http://localhost:7900/', {
      jar
    });

    assert(page.match(/logged in/));
  });

  it('can GET the home page without session', async () => {
    const home = await apos.http.get('http://localhost:7900/api/v1/apostrophe-pages', {});
    assert(home);
    assert(home.slug === '/');
    // make sure new style paths used
    assert(home.path !== '/');
    assert(home.path === home._id);
    assert(home.level === 0);
    homeId = home._id;
  });

  it('should be able to use db to insert documents', async function() {
    const testItems = [
      { _id: 'parent',
        type: 'testPage',
        slug: '/parent',
        published: true,
        path: `${homeId}/parent`,
        level: 1,
        rank: 0
      },
      {
        _id: 'child',
        type: 'testPage',
        slug: '/child',
        published: true,
        path: `${homeId}/parent/child`,
        level: 2,
        rank: 0
      },
      {
        _id: 'grandchild',
        type: 'testPage',
        slug: '/grandchild',
        published: true,
        path: `${homeId}/parent/child/grandchild`,
        level: 3,
        rank: 0
      },
      {
        _id: 'sibling',
        type: 'testPage',
        slug: '/sibling',
        published: true,
        path: `${homeId}/parent/sibling`,
        level: 2,
        rank: 1

      },
      {
        _id: 'cousin',
        type: 'testPage',
        slug: '/cousin',
        published: true,
        path: `${homeId}/parent/sibling/cousin`,
        level: 3,
        rank: 0
      },
      {
        _id: 'another-parent',
        type: 'testPage',
        slug: '/another-parent',
        published: true,
        path: `${homeId}/another-parent`,
        level: 1,
        rank: 0
      }
    ];

    const items = await apos.docs.db.insertMany(testItems);

    assert(items.result.ok === 1);
    assert(items.insertedCount === 6);
  });

  it('is able to make a subpage of the homepage without _position or _targetId', async function() {

    const body = {
      slug: '/new-tab',
      published: true,
      type: 'testPage',
      title: 'New Tab'
    };

    const page = await apos.http.post('http://localhost:7900/api/v1/apostrophe-pages', {
      body,
      jar
    });

    assert(page);
    assert(page.title === 'New Tab');
    // Is the path generally correct?
    assert.strictEqual(page.path, `${homeId}/${page._id}`);
    assert.strictEqual(page.level, 1);
  });

  it('is able to make a subpage of /parent with _position and _targetId', async function() {

    const body = {
      slug: '/new-page',
      published: true,
      type: 'testPage',
      title: 'New Page',
      _targetId: 'parent',
      _position: 'lastChild'
    };

    const page = await apos.http.post('http://localhost:7900/api/v1/apostrophe-pages', {
      body,
      jar
    });

    assert(page);
    assert(page.title === 'New Page');
    // Is the path generally correct?
    assert.strictEqual(page.path, `${homeId}/parent/${page._id}`);
    assert.strictEqual(page.level, 2);
  });

  it('cannot POST a product without a session', async () => {
    const body = {
      slug: '/new-tab',
      published: true,
      type: 'testPage',
      title: 'New Tab'
    };
    try {
      await apos.http.post('http://localhost:7900/api/v1/apostrophe-pages', {
        body
      });
      assert(false);
    } catch (e) {
      assert(true);
    }
  });
});