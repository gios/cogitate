module.exports = function(router) {
  'use strict';

  const knex = require('../knexConfig')
  const userMethods = require('../methods/userMethods')
  const moment = require('moment')

  router.get('/api/discussions/get_types', function *() {
    let availableTypes = yield knex('types').select()
    this.body = { types: availableTypes }
  })

  router.get('/api/discussions/get_tags', function *() {
    let availableTags = yield knex('tags').select()
    this.body = { tags: availableTags }
  })

  router.get('/api/discussions/get_limites', function *() {
    this.body = {
      limites: [
        {name: '1 Hour'},
        {name: '2 Hours'},
        {name: '3 Hours'},
        {name: '6 Hours'},
        {name: '12 Hours'},
        {name: 'All Day'}
      ]
    }
  })

  router.post('/api/discussion', function *() {
    let name = this.request.body.name
    let description = this.request.body.description
    let typeId = this.request.body.typeId
    let isPrivate = this.request.body.isPrivate
    let password = this.request.body.password
    let isLimited = this.request.body.isLimited
    let limitedTime = this.request.body.limitedTime
    let tags = this.request.body.tags
    let owner = this.request.body.owner

    let findUser = yield knex('users').first('id').where('email', owner)
    let nameExist = yield knex('discussions').first('id').where('name', name)

    if(nameExist) {
      this.throw('Name of discussion should be unique', 409)
    }

    let discussionId = yield knex('discussions')
    .returning('id')
    .insert({
      name,
      description,
      type_id: typeId,
      is_private: isPrivate,
      password: password ? userMethods.cryptoPassword(password) : null,
      is_limited: isLimited,
      limited_time: limitedTime,
      user_id: findUser.id,
      closed: false,
      created_at: new Date(),
      updated_at: new Date()
    })

    let findTags = yield knex('tags').whereIn('name', tags).select('id', 'name')
    let findTagsArray = findTags.map((item) => item.name)
    let createTags = tags.filter((name) => findTagsArray.indexOf(name) === -1)

    if(createTags.length) {
      yield knex('tags').insert(createTags.map((name) => {
        return {
          name,
          created_at: new Date(),
          updated_at: new Date()
        }
      }))
    }

    let getTags = yield knex('tags').whereIn('name', tags)
    yield knex('discussions_tags').insert(getTags.map((item) => {
      return {
        discussion_id: discussionId[0],
        tag_id: item.id
      }
    }))

    this.body = {
      id: discussionId[0],
      message: `Discussion ${name} has been created`
    }
  })

  router.post('/api/discussion_info/:id', function *() {
    let userInfo = this.state.user
    let id = this.request.body.id
    let password = this.request.body.password

    let foundDiscussion = yield knex('discussions')
    .select('discussions.id',
            'discussions.name',
            'discussions.description',
            'types.name AS type_name',
            'users.email AS user_email',
            'discussions.is_private',
            'discussions.is_limited',
            'discussions.limited_time',
            'discussions.closed')
    .leftJoin('discussions_tags', 'discussions.id', 'discussions_tags.discussion_id')
    .innerJoin('types', 'discussions.type_id', 'types.id')
    .innerJoin('users', 'discussions.user_id', 'users.id')
    .groupBy('discussions.id',
             'discussions.name',
             'discussions.description',
             'types.name',
             'users.email',
             'discussions.is_private',
             'discussions.is_limited',
             'discussions.limited_time',
             'discussions.closed')
    .where('discussions.id', id)
    .first()

    let foundDiscussionTags = yield knex('discussions')
    .select('discussions.name', 'tags.name AS tag_name')
    .leftJoin('discussions_tags', 'discussions.id', 'discussions_tags.discussion_id')
    .innerJoin('tags', 'tags.id', 'discussions_tags.tag_id')
    .groupBy('discussions.name', 'tags.name')
    .where('discussions.id', id)

    if(foundDiscussion.is_private) {
      let foundDiscussionPassword = yield knex('discussions').select('password').where('discussions.id', id).first()
      let isCorrectPassword = userMethods.encryptoPassword(foundDiscussionPassword.password) === password ? true : false

      if(!isCorrectPassword) {
        this.throw('Password of this discussion not correct', 404)
      }
    }

    foundDiscussion.tags = []
    let diffLimited = moment.duration(moment(foundDiscussion.limited_time).diff(moment().utcOffset(userInfo.gmt)))

    for (let indexTag of foundDiscussionTags) {
      if (foundDiscussion.name === indexTag.name) {
        foundDiscussion.tags.push(indexTag.tag_name)
      }
    }

    if(foundDiscussion.is_limited) {
      if(diffLimited.as('seconds') < 0) {
        yield knex('discussions').where('id', foundDiscussion.id).update({ closed: true })
        this.throw('This discussion has expired', 409)
      }

      if(diffLimited.as('days') < -7) {
        yield knex('discussions').where('id', foundDiscussion.id).del()
        this.throw('This discussion not found', 404)
      }
    }

    this.body = foundDiscussion
  })

  router.get('/api/discussions', function *() {
    let userInfo = this.state.user

    let discussionsTags = yield knex('discussions')
    .select('discussions.name', 'users.email AS user_email', 'tags.name AS tag_name')
    .leftJoin('discussions_tags', 'discussions.id', 'discussions_tags.discussion_id')
    .innerJoin('tags', 'tags.id', 'discussions_tags.tag_id')
    .innerJoin('users', 'discussions.user_id', 'users.id')
    .groupBy('discussions.name', 'users.email', 'tags.name')
    .where('users.email', userInfo.email)

    let discussionsData = yield knex('discussions')
    .select('discussions.id',
            'discussions.name',
            'discussions.description',
            'types.name AS type_name',
            'users.email AS user_email',
            'discussions.is_private',
            'discussions.is_limited',
            'discussions.limited_time',
            'discussions.closed')
    .leftJoin('discussions_tags', 'discussions.id', 'discussions_tags.discussion_id')
    .innerJoin('types', 'discussions.type_id', 'types.id')
    .innerJoin('users', 'discussions.user_id', 'users.id')
    .groupBy('discussions.id',
             'discussions.name',
             'discussions.description',
             'types.name',
             'users.email',
             'discussions.is_private',
             'discussions.is_limited',
             'discussions.limited_time',
             'discussions.closed')
    .where('users.email', userInfo.email)

    for (let indexData of discussionsData) {
      indexData.tags = []
      let diffLimited = moment.duration(moment(indexData.limited_time).diff(moment().utcOffset(userInfo.gmt)))

      for (let indexTag of discussionsTags) {
        if (indexData.name === indexTag.name) {
          indexData.tags.push(indexTag.tag_name)
        }
      }

      if(indexData.is_limited) {
        if(diffLimited.as('seconds') < 0) {
          yield knex('discussions').where('id', indexData.id).update({ closed: true })
        }

        if(diffLimited.as('days') < -7) {
          yield knex('discussions').where('id', indexData.id).del()
        }
      }
    }

    this.body = discussionsData
  })
}
