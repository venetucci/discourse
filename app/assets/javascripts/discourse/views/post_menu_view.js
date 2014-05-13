/**
  This view renders a menu below a post. It uses buffered rendering for performance.

  @class PostMenuView
  @extends Discourse.View
  @namespace Discourse
  @module Discourse
**/
Discourse.PostMenuView = Discourse.View.extend({
  tagName: 'section',
  classNames: ['post-menu-area', 'clearfix'],

  shouldRerender: Discourse.View.renderIfChanged(
    'post.deleted_at',
    'post.flagsAvailable.@each',
    'post.reply_count',
    'post.showRepliesBelow',
    'post.can_delete',
    'post.read',
    'post.topic.last_read_post_number',
    'post.bookmarked',
    'post.shareUrl',
    'post.topic.deleted_at',
    'post.replies.length',
    'post.wiki'),

  render: function(buffer) {
    var post = this.get('post');

    buffer.push("<nav class='post-controls'>");

    this.renderReplies(post, buffer);
    this.renderButtons(post, buffer);

    buffer.push("</nav>");
  },

  // Delegate click actions
  click: function(e) {
    var $target = $(e.target);
    var action = $target.data('action') || $target.parent().data('action');
    if (!action) return;

    var handler = this["click" + action.capitalize()];
    if (!handler) return;

    handler.call(this);
  },

  // Replies Button
  renderReplies: function(post, buffer) {
    if (!post.get('showRepliesBelow')) return;

    var reply_count = post.get('reply_count');
    buffer.push("<button class='show-replies' data-action='replies'>");
    buffer.push("<span class='badge-posts'>" + reply_count + "</span>");
    buffer.push(I18n.t("post.has_replies", { count: reply_count }));

    var icon = (this.get('post.replies.length') > 0) ? 'fa-chevron-up' : 'fa-chevron-down';
    return buffer.push("<i class='fa " + icon + "'></i></button>");
  },

  renderButtons: function(post, buffer) {
    var self = this;
    Discourse.get('postButtons').toArray().reverse().forEach(function(button) {
      var renderer = "render" + button;
      if(self[renderer]) self[renderer](post, buffer);
    });
  },

  clickReplies: function() {
    if (this.get('post.replies.length') > 0) {
      this.set('post.replies', []);
    } else {
      this.get('post').loadReplies();
    }
  },

  // Delete button
  renderDelete: function(post, buffer) {
    var label, action, icon;


    if (post.get('post_number') === 1) {

      // If it's the first post, the delete/undo actions are related to the topic
      var topic = post.get('topic');
      if (topic.get('deleted_at')) {
        if (!topic.get('details.can_recover')) { return; }
        label = "topic.actions.recover";
        action = "recoverTopic";
        icon = "undo";
      } else {
        if (!topic.get('details.can_delete')) { return; }
        label = "topic.actions.delete";
        action = "deleteTopic";
        icon = "trash-o";
      }

    } else {

      // The delete actions target the post iteself
      if (post.get('deleted_at') || post.get('user_deleted')) {
        if (!post.get('can_recover')) { return; }
        label = "post.controls.undelete";
        action = "recover";
        icon = "undo";
      } else {
        if (!post.get('can_delete')) { return; }
        label = "post.controls.delete";
        action = "delete";
        icon = "trash-o";
      }
    }

    buffer.push("<button title=\"" +
                I18n.t(label) +
                "\" data-action=\"" + action + "\" class=\"delete\"><i class=\"fa fa-" + icon + "\"></i></button>");
  },

  clickDeleteTopic: function() {
    this.get('controller').deleteTopic();
  },

  clickRecoverTopic: function() {
    this.get('controller').recoverTopic();
  },

  clickRecover: function() {
    this.get('controller').recoverPost(this.get('post'));
  },

  clickDelete: function() {
    this.get('controller').deletePost(this.get('post'));
  },

  // Like button
  renderLike: function(post, buffer) {
    if (!post.get('actionByName.like.can_act')) return;
    buffer.push("<button title=\"" +
                (I18n.t("post.controls.like")) +
                "\" data-action=\"like\" class='like'><i class=\"fa fa-heart\"></i></button>");
  },

  clickLike: function() {
    var likeAction = this.get('post.actionByName.like');
    if (likeAction) likeAction.act();
  },

  // Flag button
  renderFlag: function(post, buffer) {
    if (!this.present('post.flagsAvailable')) return;
    buffer.push("<button title=\"" +
                (I18n.t("post.controls.flag")) +
                "\" data-action=\"flag\" class='flag'><i class=\"fa fa-flag\"></i></button>");
  },

  clickFlag: function() {
    this.get('controller').send('showFlags', this.get('post'));
  },

  // Edit button
  renderEdit: function(post, buffer) {
    if (!post.get('can_edit')) return;
    buffer.push("<button title=\"" +
                 (I18n.t("post.controls.edit")) +
                 "\" data-action=\"edit\" class='edit'><i class=\"fa fa-pencil\"></i></button>");
  },

  clickEdit: function() {
    this.get('controller').editPost(this.get('post'));
  },

  // Share button
  renderShare: function(post, buffer) {
    buffer.push("<button title=\"" +
                 I18n.t("post.controls.share") +
                 "\" data-share-url=\"" + post.get('shareUrl') + "\" data-post-number=\"" + post.get('post_number') +
                 "\" class='share'><i class=\"fa fa-link\"></i></button>");
  },

  // Reply button
  renderReply: function(post, buffer) {
    if (!this.get('controller.model.details.can_create_post')) return;
    buffer.push("<button title=\"" +
                 (I18n.t("post.controls.reply")) +
                 "\" class='create' data-action=\"reply\"><i class='fa fa-reply'></i><span class='btn-text'>" +
                 (I18n.t("topic.reply.title")) + "</span></button>");
  },

  clickReply: function() {
    this.get('controller').replyToPost(this.get('post'));
  },

  // Bookmark button
  renderBookmark: function(post, buffer) {
    if (!Discourse.User.current()) return;

    var iconClass = 'read-icon',
        buttonClass = 'bookmark',
        topic = post.get('topic'),
        tooltip;

    if (post.get('bookmarked')) {
      iconClass += ' bookmarked';
      buttonClass += ' bookmarked';
      tooltip = I18n.t('bookmarks.created');
    } else if (topic && topic.get('last_read_post_number') === post.get('post_number')) {
      iconClass += ' last-read';
      tooltip = I18n.t('bookmarks.last_read');
    } else {
      iconClass += (post.get('read') ? ' seen' : ' unseen');
      tooltip = I18n.t('bookmarks.not_bookmarked');
    }

    buffer.push("<button title=\"" + tooltip +
                "\" data-action=\"bookmark\" class='" + buttonClass +
                "'><div class='" + iconClass +
                "'></div></button>");
  },

  clickBookmark: function() {
    this.get('post').toggleProperty('bookmarked');
  },

  renderAdmin: function(post, buffer) {
    var currentUser = Discourse.User.current();
    if (!currentUser || !currentUser.get('canManageTopic')) {
      return;
    }

    buffer.push('<button title="' + I18n.t("post.controls.admin") + '" data-action="admin" class="admin"><i class="fa fa-wrench"></i>');

    this.renderAdminPopup(post, buffer);

    buffer.push('</button>');
  },

  renderAdminPopup: function(post, buffer) {
    var wikiText = post.get('wiki') ? I18n.t('post.controls.unwiki') : I18n.t('post.controls.wiki');
    buffer.push('<div class="post-admin-menu"><h3>' + I18n.t('admin_title') + '</h3><ul><li class="btn btn-admin" data-action="toggleWiki"><i class="fa fa-pencil-square-o"></i>' + wikiText +'</li></ul></div>');
  },

  clickAdmin: function() {
    var $adminMenu = this.$('.post-admin-menu');
    this.set('postView.adminMenu', $adminMenu);
    $adminMenu.show();
  },

  clickToggleWiki: function() {
    this.get('controller').send('toggleWiki', this.get('post'));
  }

});
