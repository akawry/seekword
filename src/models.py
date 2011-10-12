from google.appengine.ext import db
from django.utils import simplejson
from dict2xml import dict2xml

class Level(db.Model):
    ''' Defines a level'''
    
    # the word grid as a string. wrapped around by the client  
    grid = db.StringProperty()
    # list of words available to be found in the grid 
    word_bank = db.StringListProperty()
    # when this level is active 
    time = db.DateTimeProperty()
    
    def to_xml(self):
        obj = {"response" : {"grid": self.grid, "word_bank" : {"word" : self.word_bank}, "time" : str(self.time.utcnow())}}
        return dict2xml(obj).to_string()
    
    def to_json(self):
        obj = {"response" : {"grid": self.grid, "word_bank" : self.word_bank, "time" : str(self.time.utcnow())}}
        return simplejson.dumps(obj)
    
    
class User(db.Model):
    ''' User for keeping track of scores and submissions '''
    name = db.StringProperty()

class Submission(db.Model):
    ''' When a level is completed by a user '''
    
    # submitting user 
    user = db.ReferenceProperty(User)
    # score achieved for submission 
    score = db.IntegerProperty()
    # time of submission 
    time = db.DateTimeProperty()
    # list of words found in the session 
    words_found = db.StringListProperty()