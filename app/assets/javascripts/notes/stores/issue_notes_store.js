/* eslint-disable no-param-reassign */

import service from '../services/issue_notes_service';

const findNoteObjectById = (notes, id) => notes.filter(n => n.id === id)[0];

const state = {
  notes: [],
};

const getters = {
  notes(storeState) {
    return storeState.notes;
  },
};

const mutations = {
  setNotes(storeState, notes) {
    storeState.notes = notes;
  },
  toggleDiscussion(storeState, { discussionId }) {
    const discussion = findNoteObjectById(storeState.notes, discussionId);

    discussion.expanded = !discussion.expanded;
  },
  deleteNote(storeState, note) {
    const noteObj = findNoteObjectById(storeState.notes, note.discussion_id);

    if (noteObj.individual_note) {
      storeState.notes.splice(storeState.notes.indexOf(noteObj), 1);
    } else {
      const comment = findNoteObjectById(noteObj.notes, note.id);
      noteObj.notes.splice(noteObj.notes.indexOf(comment), 1);

      if (!noteObj.notes.length) {
        storeState.notes.splice(storeState.notes.indexOf(noteObj), 1);
      }
    }
  },
  addNewReplyToDiscussion(storeState, note) {
    const noteObj = findNoteObjectById(storeState.notes, note.discussion_id);

    noteObj.notes.push(note);
  },
  updateNote(storeState, note) {
    const noteObj = findNoteObjectById(storeState.notes, note.discussion_id);

    if (noteObj.individual_note) {
      noteObj.notes.splice(0, 1, note);
    } else {
      const comment = findNoteObjectById(noteObj.notes, note.id);
      noteObj.notes.splice(noteObj.notes.indexOf(comment), 1, note);
    }
  },
  addNewNote(storeState, note) {
    // TODO: @fatihacet - When we get the correct data from server update the store
    // storeState.notes.push(note);
  },
};

const actions = {
  fetchNotes(context, path) {
    return service
      .fetchNotes(path)
      .then(res => res.json())
      .then((res) => {
        context.commit('setNotes', res);
      });
  },
  deleteNote(context, note) {
    return service
      .deleteNote(note.path)
      .then(() => {
        context.commit('deleteNote', note);
      });
  },
  replyToDiscussion(context, data) {
    const { endpoint, reply } = data;

    return service
      .replyToDiscussion(endpoint, reply)
      .then(res => res.json())
      .then((res) => {
        context.commit('addNewReplyToDiscussion', res);
      });
  },
  updateNote(context, data) {
    const { endpoint, note } = data;

    return service
      .updateNote(endpoint, note)
      .then(res => res.json())
      .then((res) => {
        context.commit('updateNote', res);
      });
  },
  createNewNote(context, data) {
    const { endpoint, noteData } = data;
    return service
      .createNewNote(endpoint, noteData)
      .then(res => res.json())
      .then((res) => {
        context.commit('addNewNote', res);
      });
  },
};

export default {
  state,
  getters,
  mutations,
  actions,
};
