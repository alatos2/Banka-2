import chai from 'chai';
import should from 'should';
import 'chai/register-should';
import chaiHttp from 'chai-http';
import app from '../index';

chai.use(chaiHttp);

describe('Test account related endpoints - POST, GET, PATH, DELETE', () => {
  let clientToken;
  let adminToken;
  let sholaAccountNumber;

  /**
     * Sign in user to generate user token before test
     */
  before('Sign in user to obtain auth token to be used in other account operations', (done) => {
    const userCredential = {
      email: 'sholaadeola@gmail.com',
      password: 'password',
    };

    chai
      .request(app)
      .post('/api/v1/auth/signin')
      .send(userCredential)
      .end((err, res) => {
        res.should.have.status(200);
        if (!err) {
          clientToken = res.body.data.token;
        }
        done();
      });
  });

  /**
     * Test the POST /accounts/ endpoint
     */
  describe('POST /accounts', () => {
    it('it should check for token in the request header', (done) => {
      const details = {
        type: 'savings',
        balance: 0.00,
      };

      chai
        .request(app)
        .post('/api/v1/accounts')
        .send(details)
        .end((err, res) => {
          should(res.headers['x-access-token']).be.type('undefined');
          done();
        });
    });

    it('it should check if token is invalid', (done) => {
      const details = {
        type: 'savings',
        balance: 0.00,
      };

      chai
        .request(app)
        .post('/api/v1/accounts')
        .set('x-access-token', 10000)
        .send(details)
        .end((err, res) => {
          res.should.have.status(401);
          res.body.should.be.a('object');
          res.body.should.have.property('error').eql('invalid request token');
          done();
        });
    });


    it('it should create a bank account', (done) => {
      const details = {
        type: 'savings',
        balance: 0.00,
      };

      chai
        .request(app)
        .post('/api/v1/accounts')
        .set('x-access-token', clientToken)
        .send(details)
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.be.a('object');
          res.body.data.should.have.property('accountNumber');
          res.body.data.should.have.property('firstName');
          res.body.data.should.have.property('lastName');
          res.body.data.should.have.property('email');
          res.body.data.should.have.property('type');
          res.body.data.should.have.property('balance');
          if (!err) {
            sholaAccountNumber = Number(res.body.data.accountNumber);
          }
          done();
        });
    });

    it('it should throw error when account type is not specified', (done) => {
      const details = {
        balance: 0.00,
      };

      chai
        .request(app)
        .post('/api/v1/accounts')
        .send(details)
        .set('x-access-token', clientToken)
        .end((err, res) => {
          res.should.have.status(422);
          res.body.should.be.a('object');
          res.body.should.have.property('error').eql('type is required');
          done();
        });
    });

    it('it should throw error when account type is different from savings and account', (done) => {
      const details = {
        type: 'somethingdifferent',
      };

      chai
        .request(app)
        .post('/api/v1/accounts')
        .set('x-access-token', clientToken)
        .send(details)
        .end((err, res) => {
          res.should.have.status(422);
          res.body.should.be.a('object');
          res.body.should.have.property('error').eql('type must be one of [savings, current]');
          done();
        });
    });
  });


  /**
     * Test the GET /accounts/ routes
     */
  describe('GET /accounts', () => {
    it('it should throw permission error if user is not an admin', (done) => {
      chai
        .request(app)
        .get('/api/v1/accounts')
        .set('x-access-token', clientToken)
        .end((err, res) => {
          res.should.have.status(403);
          res.body.should.have.property('error').eql('only a staff has the permission to get all bank accounts');
          done();
        });
    });

    before('Sign in as an admin/staff because only admin/staff can get list of bank accounts', (done) => {
      const userCredential = {
        email: 'tejumoladavid@gmail.com',
        password: 'password',
      };

      chai
        .request(app)
        .post('/api/v1/auth/signin')
        .send(userCredential)
        .end((err, res) => {
          res.should.have.status(200);
          if (!err) {
            adminToken = res.body.data.token;
          }
          done();
        });
    });

    it('it should get all the bank accounts', (done) => {
      chai
        .request(app)
        .get('/api/v1/accounts')
        .set('x-access-token', adminToken)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.data.should.have.property('accounts').be.a('array');
          done();
        });
    });
  });


  /**
     * Test the GET /accounts/:accountNumber route
     */
  describe('GET /accounts/:accountNumber', () => {
    it('it should throw an error if a client wants to get other user\'s account', (done) => {
      const accountNumber = 222010772;
      chai
        .request(app)
        .get(`/api/v1/accounts/${accountNumber}`)
        .set('x-access-token', clientToken)
        .end((err, res) => {
          res.should.have.status(403);
          res.body.should.be.a('object');
          res.body.should.have.property('error').eql('only a staff has the permission to get other user\'s account');
          done();
        });
    });

    it('it should GET a bank account details as a client if i own the account', (done) => {
      const accountNumber = sholaAccountNumber;
      chai
        .request(app)
        .get(`/api/v1/accounts/${accountNumber}`)
        .set('x-access-token', clientToken)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.data.should.have.property('accountNumber').eql(accountNumber);
          res.body.data.should.have.property('firstName');
          res.body.data.should.have.property('lastName');
          res.body.data.should.have.property('email');
          res.body.data.should.have.property('type');
          res.body.data.should.have.property('balance');
          done();
        });
    });

    it('it should GET a bank account details as a staff', (done) => {
      const accountNumber = 222010772;
      chai
        .request(app)
        .get(`/api/v1/accounts/${accountNumber}`)
        .set('x-access-token', adminToken)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.data.should.have.property('accountNumber').eql(accountNumber);
          res.body.data.should.have.property('firstName');
          res.body.data.should.have.property('lastName');
          res.body.data.should.have.property('email');
          res.body.data.should.have.property('type');
          res.body.data.should.have.property('balance');
          done();
        });
    });

    it('it should throw an error when account number is not found', (done) => {
      const accountNumber = 2220107724455; // octal number format
      chai
        .request(app)
        .get(`/api/v1/accounts/${accountNumber}`)
        .set('x-access-token', adminToken)
        .end((err, res) => {
          res.should.have.status(400);
          res.body.should.be.a('object');
          res.body.should.have.property('error').eql('account number doesn\'t exist');
          done();
        });
    });
  });

  /**
     * Test the PATCH /accounts/:accountNumber route
     */
  describe('PATCH /accounts/:accountNumber', () => {
    it('it should throw permission error if user is not an admin', (done) => {
      const accountNumber = 222010872;
      const body = { status: 'active' };
      chai
        .request(app)
        .patch(`/api/v1/accounts/${accountNumber}`)
        .set('x-access-token', clientToken)
        .send(body)
        .end((err, res) => {
          res.should.have.status(403);
          res.body.should.be.a('object');
          res.body.should.have.property('error').eql('only a staff has the permission to change account status');
          done();
        });
    });


    it('it should activate a user bank account', (done) => {
      const accountNumber = 222010872;
      const body = { status: 'active' };
      chai
        .request(app)
        .patch(`/api/v1/accounts/${accountNumber}`)
        .set('x-access-token', adminToken)
        .send(body)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.data.should.have.property('accountNumber').eql(accountNumber);
          res.body.data.should.have.property('status').eql(body.status);
          done();
        });
    });

    it('it should set a bank account as dormant', (done) => {
      const accountNumber = 222010872;
      const body = { status: 'dormant' };
      chai
        .request(app)
        .patch(`/api/v1/accounts/${accountNumber}`)
        .set('x-access-token', adminToken)
        .send(body)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.data.should.have.property('accountNumber').eql(accountNumber);
          res.body.data.should.have.property('status').eql(body.status);
          done();
        });
    });

    it('it should throw an error when account number is not found', (done) => {
      const accountNumber = 2220108723333;
      const body = { status: 'dormant' };
      chai
        .request(app)
        .patch(`/api/v1/accounts/${accountNumber}`)
        .set('x-access-token', adminToken)
        .send(body)
        .end((err, res) => {
          res.should.have.status(400);
          res.body.should.be.a('object');
          res.body.should.have.property('error').eql('account number doesn\'t exist');
          done();
        });
    });

    it('it should throw error when request body status is different from dormant or active', (done) => {
      const accountNumber = 222010872;
      const body = { status: 'validate' };
      chai
        .request(app)
        .patch(`/api/v1/accounts/${accountNumber}`)
        .set('x-access-token', adminToken)
        .send(body)
        .end((err, res) => {
          res.should.have.status(422);
          res.body.should.be.a('object');
          res.body.should.have.property('error').eql('status must be one of [dormant, active]');
          done();
        });
    });
  });

  /**
     * Test  DELETE /accounts/:accountNumber route
     */
  describe('DELETE /accounts/:accountNumber', () => {
    it('it should throw permission error if user is not an admin', (done) => {
      const accountNumber = 222010872;
      chai
        .request(app)
        .delete(`/api/v1/accounts/${accountNumber}`)
        .set('x-access-token', clientToken)
        .end((err, res) => {
          res.should.have.status(403);
          res.body.should.have.property('error').eql('only a staff has the permission to delete an account');
          done();
        });
    });

    it('it should DELETE a bank record ', (done) => {
      const accountNumber = 222010872;
      chai
        .request(app)
        .delete(`/api/v1/accounts/${accountNumber}`)
        .set('x-access-token', adminToken)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.be.a('object');
          res.body.should.have
            .property('message')
            .eql('Account successfully deleted');
          done();
        });
    });

    it('it should throw an error when account number is not found', (done) => {
      const accountNumber = 222010872;
      chai
        .request(app)
        .delete(`/api/v1/accounts/${accountNumber}`)
        .set('x-access-token', adminToken)
        .end((err, res) => {
          res.should.have.status(400);
          res.body.should.be.a('object');
          res.body.should.have.property('error').eql('account number doesn\'t exist');
          done();
        });
    });
  });
});
